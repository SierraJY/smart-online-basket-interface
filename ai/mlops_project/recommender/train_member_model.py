import os, json, pickle, subprocess, time, traceback, shutil
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf
import tensorflow_recommenders as tfrs  # noqa: F401
from sklearn.model_selection import train_test_split
from sqlalchemy import create_engine
import tf2onnx
from onnxruntime.quantization import quantize_dynamic, QuantType
import mlflow
import mlflow.tensorflow

# ===============================
# 0) 경로/환경 + SSH 유틸 (영구 해결)
# ===============================
APP_HOME = Path(__file__).resolve().parent  # /app

# MLflow 설정
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

# 🎯 체계적인 모델 저장 구조 (환경변수로 받아서 유연하게 설정)
MEMBER_MODELS_DIR = Path(os.getenv("OUTPUT_DIR", "/opt/airflow/models/member/latest")).parent.parent
MEMBER_LATEST_DIR = Path(os.getenv("OUTPUT_DIR", "/opt/airflow/models/member/latest"))
MEMBER_ARCHIVE_DIR = MEMBER_MODELS_DIR / "archive"
MEMBER_SERVING_DIR = MEMBER_MODELS_DIR / "serving"

# 디렉토리 생성
for dir_path in [MEMBER_LATEST_DIR, MEMBER_ARCHIVE_DIR, MEMBER_SERVING_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# 현재 학습용 디렉토리 (latest 사용)
OUTPUT_DIR = MEMBER_LATEST_DIR

# 룩업 테이블 경로 (latest 디렉토리 기준)
CONTEXT_LOOKUP_PATH  = OUTPUT_DIR / "context_lookup.npy"
ID_LOOKUP_PATH       = OUTPUT_DIR / "id_lookup.npy"
USER_LOOKUP_PATH     = OUTPUT_DIR / "user_lookup.npy"
ITEM_LOOKUP_PATH     = OUTPUT_DIR / "item_lookup.npy"
ID2TITLE_PATH        = OUTPUT_DIR / "id2title.json"
USER_PROD_CNT_PATH   = OUTPUT_DIR / "user_product_count.pkl"
SAVED_MODEL_PATH     = OUTPUT_DIR / "serving_model"
KERAS_WEIGHTS_PATH   = OUTPUT_DIR / "two_tower.weights.h5"
ITEM_EMB_PATH        = OUTPUT_DIR / "item_embeddings.npy"
ONNX_MODEL_PATH      = OUTPUT_DIR / "two_tower_model.onnx"
QUANTIZED_MODEL_PATH = OUTPUT_DIR / "two_tower_model_quantized.onnx"

MAX_CONTEXT_LEN = 10
BATCH_SIZE = 2048
EPOCHS = 1
EMBED_DIM = 32
SCALING_FACTOR = 10000.0

def p(x): return str(x)

# Airflow DB 연결 설정 (Airflow DB 사용)
DB_HOST = os.getenv("DB_HOST", "sobi-db")
DB_NAME = "airflowdb"
DB_USER = "airflow"
DB_PASSWORD = "airflow123"
DB_PORT = int(os.getenv("DB_PORT", "5432"))

# Airflow DB URL
DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

CSV_PATH = Path(os.getenv("CSV_PATH", APP_HOME / "data" / "purchased_history.csv")).resolve()

def assert_written(path: Path):
    if not path.exists() or (path.is_file() and path.stat().st_size == 0):
        raise RuntimeError(f"save failed: {p(path)}")
    print(f"[✓] saved: {p(path)} size={path.stat().st_size if path.is_file() else '-'}")

def get_kst_today():
    return datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()

# ===== SSH 유틸 (영구 해결) =====
SSH_OPTS = (
    "-o BatchMode=yes -o PreferredAuthentications=publickey -o IdentitiesOnly=yes "
    "-o StrictHostKeyChecking=no -o ConnectTimeout=5"
)

def ensure_ssh_key() -> str:
    src = "/mnt/ssh/id_ed25519_jetson"
    if not os.path.exists(src):
        raise RuntimeError(f"SSH key not found: {src}")
    tmp_dir = "/tmp/ssh"
    os.makedirs(tmp_dir, exist_ok=True)
    dst = os.path.join(tmp_dir, "jetson_key")
    shutil.copy2(src, dst)
    os.chmod(dst, 0o600)
    return dst

def ssh_test():
    key = ensure_ssh_key()
    host = os.getenv("JETSON_HOST", "host.docker.internal")
    port = os.getenv("JETSON_SSH_PORT", "2222")
    user = os.getenv("JETSON_USER", "ssafy")
    cmd = f'ssh -i {key} -p {port} {SSH_OPTS} {user}@{host} "true"'
    subprocess.run(cmd, shell=True, check=True)

def rsync_push(src_dir: Path, dest_dir_env: str):
    key = ensure_ssh_key()
    host = os.getenv("JETSON_HOST", "host.docker.internal")
    port = os.getenv("JETSON_SSH_PORT", "2222")
    user = os.getenv("JETSON_USER", "ssafy")
    dest = os.getenv(dest_dir_env)
    if not dest:
        raise RuntimeError(f"{dest_dir_env} env required")
    src = p(src_dir).rstrip("/") + "/"
    dest = dest.rstrip("/") + "/"
    cmd = (
        f'rsync -azv --delete --partial --inplace --timeout=300 '
        f'-e "ssh -i {key} -p {port} {SSH_OPTS} -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o TCPKeepAlive=yes" '
        f'{src} {user}@{host}:{dest}'
    )
    subprocess.run(cmd, shell=True, check=True)

# ===== 1. 데이터 로드 =====
def gender_to_int(x):
    x = str(x).strip().lower()
    if x in ["1","m","male","남"]: return 1
    if x in ["2","f","female","여"]: return 2
    return 0

def load_member_data_from_csv(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        print("[!] CSV_PATH 미설정 또는 파일 없음:", csv_path)
        return pd.DataFrame()
    df = pd.read_csv(csv_path)
    if "purchase_date" not in df.columns:
        print("[!] CSV에 purchase_date 컬럼 없음")
        return pd.DataFrame()
    df["purchase_date"] = pd.to_datetime(df["purchase_date"])
    latest_date = df["purchase_date"].max().date()
    df = df[df["purchase_date"].dt.date == latest_date]
    if df.empty:
        print(f"[WARN] CSV에서 {latest_date} 날짜 데이터가 없습니다.")
        return pd.DataFrame()
    df["user_id"] = df["user_id"].astype(str).str.strip().str.replace("U","", regex=False)
    df["product_id"] = df["product_id"].astype(int)
    df["gender"] = df["gender"].apply(gender_to_int)
    df["age"] = df["age"].apply(lambda x: int(x) if str(x).isdigit() and 0<=int(x)<=99 else 0)
    df["id"] = df["product_id"].astype(str)
    df["name"] = df.get("product_name","").fillna("")
    df["tag"] = (df.get("category","").astype(str) + " " + df.get("product_name","").astype(str)).str.strip()
    df = df.sort_values(["user_id","purchase_date"])
    return df

def load_today_training_data(engine):
    q = """
    SELECT user_id, product_id, gender, age, purchase_date, session_id
    FROM airflow_data.training_data
    WHERE purchase_date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY purchase_date DESC
    """
    return pd.read_sql(q, engine)

def load_dataframe() -> pd.DataFrame:
    df = load_member_data_from_csv(CSV_PATH)
    if df.empty:
        try:
            engine = create_engine(DB_URL)
            df_tr = load_today_training_data(engine)
            if df_tr.empty:
                print("[!] airflow_data.training_data에 최근 일주일 데이터 없음")
                return pd.DataFrame()
            df = df_tr.rename(columns={"purchased_at":"purchase_date"}).copy()
            df["user_id"] = df["user_id"].astype(str).str.replace("U","", regex=False)
            df["product_id"] = df["product_id"].astype(int)
            df["gender"] = df["gender"].map({"male":0,"female":1}).fillna(0).astype(int)
            df["age"] = df["age"].apply(lambda x: int(x) if str(x).isdigit() and 0<=int(x)<=99 else 0)
            df["purchase_date"] = pd.to_datetime(df.get("purchase_date", datetime.now()))
            df["id"] = df["product_id"].astype(str)
            df["name"] = ""
        except Exception as e:
            print("[ERROR] DB 로드 실패:", e)
            return pd.DataFrame()
    return df

# 🎯 MLflow 실험 설정
mlflow.set_experiment("member_recommendation")
with mlflow.start_run(run_name=f"member_model_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
    
    # MLflow에 하이퍼파라미터 기록
    mlflow.log_params({
        "max_context_len": MAX_CONTEXT_LEN,
        "batch_size": BATCH_SIZE,
        "epochs": EPOCHS,
        "embed_dim": EMBED_DIM,
        "scaling_factor": SCALING_FACTOR
    })
    
    print(f"[INFO] APP_HOME={p(APP_HOME)}")
    print(f"[INFO] OUTPUT_DIR={p(OUTPUT_DIR)} (writable={os.access(OUTPUT_DIR, os.W_OK)})")
    print(f"[INFO] CSV_PATH={p(CSV_PATH)}")
    
    df = load_dataframe()
if df.empty: raise SystemExit("[STOP] 학습에 사용할 데이터가 없습니다.")

# user_product_count
if USER_PROD_CNT_PATH.exists():
    with open(USER_PROD_CNT_PATH,"rb") as f: user_prod_cnt = pickle.load(f)
else:
    user_prod_cnt = {}
for r in df.itertuples():
    key = (str(r.user_id), int(r.product_id))
    user_prod_cnt[key] = user_prod_cnt.get(key, 0) + 1
with open(USER_PROD_CNT_PATH,"wb") as f: pickle.dump(user_prod_cnt, f)
assert_written(USER_PROD_CNT_PATH)

df["user_product_count"] = [user_prod_cnt[(str(r.user_id), int(r.product_id))] for r in df.itertuples()]
df["user_product_count"] = np.log1p(df["user_product_count"]) * SCALING_FACTOR

# ===== 3. 룩업 저장 =====
product_ids = list(dict.fromkeys(df["id"].tolist()))
user_ids = list(dict.fromkeys(df["user_id"].astype(str).tolist()))
np.save(p(CONTEXT_LOOKUP_PATH), np.array(product_ids));  assert_written(CONTEXT_LOOKUP_PATH)
np.save(p(ID_LOOKUP_PATH),      np.array(product_ids));  assert_written(ID_LOOKUP_PATH)
np.save(p(USER_LOOKUP_PATH),    np.array(user_ids));     assert_written(USER_LOOKUP_PATH)
np.save(p(ITEM_LOOKUP_PATH),    np.array(product_ids));  assert_written(ITEM_LOOKUP_PATH)

title_lookup = {str(r.id): str(getattr(r, "name","")) for r in df.itertuples()}
with open(ID2TITLE_PATH,"w",encoding="utf-8") as f: json.dump(title_lookup, f, ensure_ascii=False, indent=2)
assert_written(ID2TITLE_PATH)

# ===== 4. 모델 =====
train_df, _ = train_test_split(df, test_size=0.2, random_state=42)

def build_context(seq, window=MAX_CONTEXT_LEN):
    prev, contexts = [], []
    for pid in seq:
        contexts.append(prev[-window:])
        prev.append(pid)
    return contexts

def pad_list(x, length):
    x = list(map(str, x)) if isinstance(x, list) else []
    return x[:length] + [""]*(length-len(x))

train_df["context"] = train_df.groupby("user_id")["id"].transform(lambda x: build_context(x, MAX_CONTEXT_LEN))
train_df["context"] = train_df["context"].apply(lambda x: pad_list(x, MAX_CONTEXT_LEN))

def df_to_tf_dataset(df_in):
    return tf.data.Dataset.from_tensor_slices({
        "user_features":{
            "user_id": df_in["user_id"].astype(str).values,
            "gender": df_in["gender"].astype(np.int32).values,
            "age":    df_in["age"].astype(np.int32).values,
            "context": np.stack(df_in["context"].values),
        },
        "item_features":{"id": df_in["id"].astype(str).values},
        "user_product_count": df_in["user_product_count"].astype(np.float32).values,
    })

train_ds = df_to_tf_dataset(train_df).shuffle(1000).batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)

user_lookup_layer = tf.keras.layers.StringLookup(vocabulary=user_ids, mask_token=None, oov_token="[OOV]")
ctx_lookup_layer  = tf.keras.layers.StringLookup(vocabulary=product_ids, mask_token=None, oov_token="[OOV]")
id_lookup_layer   = tf.keras.layers.StringLookup(vocabulary=product_ids, mask_token=None, oov_token="[OOV]")

def preprocess(feat):
    return {
        "user_features":{
            "user_idx": user_lookup_layer(feat["user_features"]["user_id"]),
            "gender": tf.cast(feat["user_features"]["gender"], tf.int32),
            "age":    tf.cast(feat["user_features"]["age"], tf.int32),
            "context_idx": ctx_lookup_layer(feat["user_features"]["context"]),
        },
        "item_features":{"id_idx": id_lookup_layer(feat["item_features"]["id"])},
        "user_product_count": tf.cast(feat["user_product_count"], tf.float32),
    }

train_ds_idx = train_ds.map(preprocess, num_parallel_calls=tf.data.AUTOTUNE)

class UserModel(tf.keras.Model):
    def __init__(self, n_users, n_products):
        super().__init__()
        self.user_emb = tf.keras.layers.Embedding(n_users+2, EMBED_DIM)
        self.gender_emb = tf.keras.layers.Embedding(3, 4)
        self.age_emb = tf.keras.layers.Embedding(100, 4)
        self.context_emb = tf.keras.layers.Embedding(n_products+2, EMBED_DIM)
    def call(self, f):
        u = self.user_emb(f["user_idx"])
        g = self.gender_emb(f["gender"])
        a = self.age_emb(f["age"])
        ctx = tf.reduce_mean(self.context_emb(f["context_idx"]), axis=1) * 5.0
        return tf.concat([u,g,a,ctx], axis=-1)

class ItemModel(tf.keras.Model):
    def __init__(self, n_products):
        super().__init__()
        self.emb = tf.keras.layers.Embedding(n_products+2, EMBED_DIM)
    def call(self, f): return self.emb(f["id_idx"])

class TwoTowerModel(tf.keras.Model):
    def __init__(self, n_users, n_products):
        super().__init__()
        self.query_model = UserModel(n_users, n_products)
        self.candidate_model = ItemModel(n_products)
        self.concat_dense = tf.keras.layers.Dense(EMBED_DIM, name="output")
    def train_step(self, f):
        with tf.GradientTape() as tape:
            ue = self.query_model(f["user_features"])
            ie = self.candidate_model(f["item_features"])
            inter = tf.expand_dims(f["user_product_count"], -1)
            out = self.concat_dense(tf.concat([ue, ie, inter], axis=-1))
            loss = tf.reduce_mean(tf.square(out - inter))
        grads = tape.gradient(loss, self.trainable_variables)
        self.optimizer.apply_gradients(zip(grads, self.trainable_variables))
        return {"loss": loss}
    def call(self, f):
        ue = self.query_model(f["user_features"])
        ie = self.candidate_model(f["item_features"])
        inter = tf.expand_dims(f["user_product_count"], -1)
        return self.concat_dense(tf.concat([ue, ie, inter], axis=-1))

num_users, num_products = len(user_ids), len(product_ids)
model = TwoTowerModel(num_users, num_products)
model.compile(optimizer=tf.keras.optimizers.Adagrad(0.1))

# 🎯 기존 가중치 확인 및 추가 학습 모드 전환
if KERAS_WEIGHTS_PATH.exists():
    print(f"\n🔄 기존 모델 가중치 발견: {KERAS_WEIGHTS_PATH}")
    print("📚 추가 학습 모드로 전환...")
    
    try:
        # 기존 가중치 로드
        model.load_weights(str(KERAS_WEIGHTS_PATH))
        print("✅ 기존 가중치 로드 성공!")
        
        # 추가 학습 (전체 학습 대비 적은 에포크)
        ADDITIONAL_EPOCHS = 2
        print(f"\n[추가 학습 시작] - {ADDITIONAL_EPOCHS} 에포크")
        for e in range(ADDITIONAL_EPOCHS):
            print(f"===== [추가 학습 Epoch {e+1}/{ADDITIONAL_EPOCHS}] =====")
            model.fit(train_ds_idx, epochs=1, verbose=2)
        print("[추가 학습 완료]")
        
    except Exception as e:
        print(f"⚠️ 기존 가중치 로드 실패, 전체 학습으로 전환: {e}")
        print("\n[전체 학습 시작]")
        for e in range(EPOCHS):
            print(f"===== [Epoch {e+1}/{EPOCHS}] =====")
            model.fit(train_ds_idx, epochs=1, verbose=2)
        print("[전체 학습 완료]")
else:
    print(f"\n🆕 새로운 모델 학습 시작")
    print("\n[전체 학습 시작]")
    for e in range(EPOCHS):
        print(f"===== [Epoch {e+1}/{EPOCHS}] =====")
        model.fit(train_ds_idx, epochs=1, verbose=2)
    print("[전체 학습 완료]")

dummy = {
    "user_features":{
        "user_idx": tf.constant([0], tf.int32),
        "gender": tf.constant([0], tf.int32),
        "age": tf.constant([0], tf.int32),
        "context_idx": tf.constant([[0]*MAX_CONTEXT_LEN], tf.int32),
    },
    "item_features":{"id_idx": tf.constant([0], tf.int32)},
    "user_product_count": tf.constant([0.0], tf.float32),
}
_ = model(dummy)
model.save_weights(p(KERAS_WEIGHTS_PATH)); assert_written(KERAS_WEIGHTS_PATH)

class ServingModel(tf.keras.Model):
    def __init__(self, um, im, dense):
        super().__init__(); self.um=um; self.im=im; self.dense=dense
    def call(self, f):
        uidx = tf.cast(f["user_idx"], tf.int32)
        g = tf.cast(f["gender"], tf.int32)
        a = tf.cast(f["age"], tf.int32)
        cidx = tf.cast(f["context_idx"], tf.int32)
        iidx = tf.cast(f["item_idx"], tf.int32)
        cnt  = tf.cast(f["user_product_count"], tf.float32)
        u  = self.um.user_emb(uidx)
        ge = self.um.gender_emb(g)
        ae = self.um.age_emb(a)
        ce = tf.reduce_mean(self.um.context_emb(cidx), axis=1) * 5.0
        ue = tf.concat([u,ge,ae,ce], axis=-1)
        ie = self.im.emb(iidx)
        out = self.dense(tf.concat([ue, ie, tf.expand_dims(cnt,-1)], axis=-1))
        return out

serving = ServingModel(model.query_model, model.candidate_model, model.concat_dense)
_ = serving({
    "user_idx": tf.constant([0], tf.int32),
    "gender": tf.constant([0], tf.int32),
    "age": tf.constant([0], tf.int32),
    "context_idx": tf.constant([[0]*MAX_CONTEXT_LEN], tf.int32),
    "item_idx": tf.constant([0], tf.int32),
    "user_product_count": tf.constant([0.0], tf.float32),
})
tf.saved_model.save(serving, p(SAVED_MODEL_PATH)); assert_written(SAVED_MODEL_PATH)

item_embs = model.candidate_model({"id_idx": tf.constant(np.arange(num_products), tf.int32)}).numpy()
np.save(p(ITEM_EMB_PATH), item_embs); assert_written(ITEM_EMB_PATH)

try:
    spec = (
        tf.TensorSpec((None,), tf.int32, name="user_features_user_idx"),
        tf.TensorSpec((None, MAX_CONTEXT_LEN), tf.int32, name="user_features_context_idx"),
        tf.TensorSpec((None,), tf.int32, name="user_features_gender"),
        tf.TensorSpec((None,), tf.int32, name="user_features_age"),
        tf.TensorSpec((None,), tf.int32, name="item_features_id_idx"),
        tf.TensorSpec((None,), tf.float32, name="user_product_count"),
    )
    @tf.function(input_signature=spec)
    def serving_fn(u,c,g,a,i,cnt):
        f = {"user_features":{"user_idx":u,"context_idx":c,"gender":g,"age":a},
             "item_features":{"id_idx":i}, "user_product_count":cnt}
        return model(f)
    _proto, _ = tf2onnx.convert.from_function(serving_fn, input_signature=spec, output_path=p(ONNX_MODEL_PATH))
    assert_written(ONNX_MODEL_PATH)
    quantize_dynamic(p(ONNX_MODEL_PATH), p(QUANTIZED_MODEL_PATH), weight_type=QuantType.QInt8)
    assert_written(Path(QUANTIZED_MODEL_PATH))
except Exception as e:
    print(f"[WARN] ONNX 변환/양자화 오류: {e}")
    traceback.print_exc()

# ===== 4. 모델 아카이브 및 서빙용 복사 =====
try:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 1. 이전 모델을 아카이브로 이동
    if (MEMBER_LATEST_DIR / "two_tower.weights.h5").exists():
        archive_dir = MEMBER_ARCHIVE_DIR / f"member_models_{timestamp}"
        archive_dir.mkdir(parents=True, exist_ok=True)
        
        for file_path in MEMBER_LATEST_DIR.glob("*"):
            if file_path.is_file():
                shutil.copy2(file_path, archive_dir / file_path.name)
        print(f"[📦] 이전 모델을 아카이브에 저장: {archive_dir}")
    
    # 2. 서빙용 디렉토리에 복사
    for file_path in MEMBER_LATEST_DIR.glob("*"):
        if file_path.is_file():
            shutil.copy2(file_path, MEMBER_SERVING_DIR / file_path.name)
    print(f"[🚀] 서빙용 모델 준비 완료: {MEMBER_SERVING_DIR}")
    
    # MLflow에 아카이브 정보 기록
    mlflow.log_metric("archive_timestamp", float(timestamp))
    mlflow.log_artifact(str(archive_dir), "archives")
    
except Exception as e:
    print(f"[WARN] 모델 아카이브/서빙 복사 중 오류: {e}")

# ===== 5. Jetson 전송 (역터널: 127.0.0.1:2222 → Jetson 22) =====
try:
    if os.getenv("JETSON_PUSH","0") == "1":
        ssh_test()  # 대기 없이 즉시 판정
        rsync_push(OUTPUT_DIR, "JETSON_DEST_MEMBER")
        print("[✓] 젯슨(member) 동기화 완료")
    else:
        print("[INFO] 젯슨 동기화 비활성화(JETSON_PUSH!=1) - 건너뜀")
except subprocess.CalledProcessError as e:
    print(f"[ERROR] rsync/ssh failed with code {e.returncode}")
    print(e)
except Exception as e:
    print(f"[WARN] 젯슨 동기화 오류: {e}")

    # 학습 모드 확인
    learning_mode = "기존 가중치 추가 학습" if KERAS_WEIGHTS_PATH.exists() else "새로운 모델 전체 학습"
    
    # MLflow에 최종 메트릭 기록
    mlflow.log_metric("learning_mode", 1 if "기존" in learning_mode else 0)
    mlflow.log_metric("total_users", len(user_ids))
    mlflow.log_metric("total_products", len(product_ids))
    mlflow.log_metric("training_samples", len(train_df))
    
    # MLflow에 모델 아티팩트 기록
    mlflow.log_artifact(str(KERAS_WEIGHTS_PATH), "models")
    mlflow.log_artifact(str(ONNX_MODEL_PATH), "models")
    mlflow.log_artifact(str(QUANTIZED_MODEL_PATH), "models")
    mlflow.log_artifact(str(SAVED_MODEL_PATH), "models")
    
    print(f"[DONE] train_member_model.py 완료 - {learning_mode}")
    print(f"[📁] 모델 저장 위치: {OUTPUT_DIR}")
    print(f"[📦] 아카이브 위치: {MEMBER_ARCHIVE_DIR}")
    print(f"[🚀] 서빙 위치: {MEMBER_SERVING_DIR}")
    print(f"[🎯] 학습 모드: {learning_mode}")
    print(f"[🔗] MLflow 실험: member_recommendation")
    print(f"[📊] MLflow UI: {MLFLOW_TRACKING_URI}")

# MLflow run 종료
