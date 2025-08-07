import os
import pandas as pd
import numpy as np
import tensorflow as tf
import tensorflow_recommenders as tfrs
from sklearn.model_selection import train_test_split
import tf2onnx
from onnxruntime.quantization import quantize_dynamic, QuantType
from tqdm import tqdm

# ===============================
# 0. GPU 사용 가능 여부 출력
# ===============================
gpus = tf.config.list_physical_devices("GPU")
if gpus:
    print(f"[INFO] 사용 가능한 GPU: {[gpu.name for gpu in gpus]}")
else:
    print("[INFO] GPU를 찾지 못했습니다. CPU로 실행합니다.")

# ===============================
# 1. 경로 및 설정
# ===============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NEW_DATA_PATH = os.path.join(BASE_DIR, "purchased_history.csv")
MAX_CONTEXT_LEN = 10
BATCH_SIZE = 2048
EPOCHS = 1
EMBED_DIM = 32
SCALING_FACTOR = 10000.0  # << 여기만 조정! 5~20까지 실험 가능

SAVED_MODEL_PATH = os.path.join(BASE_DIR, "serving_model")
KERAS_WEIGHTS_PATH = os.path.join(BASE_DIR, "two_tower_weights.h5")
ONNX_MODEL_PATH = os.path.join(BASE_DIR, "two_tower_model.onnx")
QUANTIZED_MODEL_PATH = os.path.join(BASE_DIR, "two_tower_model_quantized.onnx")
ID_LOOKUP_PATH = os.path.join(BASE_DIR, "id_lookup.npy")
USER_LOOKUP_PATH = os.path.join(BASE_DIR, "user_lookup.npy")

# ===============================
# 2. 데이터 로딩 및 전처리 (user_product_count만 추가!)
# ===============================
print("추가 학습 데이터 경로:", NEW_DATA_PATH)
if not os.path.exists(NEW_DATA_PATH):
    raise FileNotFoundError(f"파일이 존재하지 않습니다: {NEW_DATA_PATH}")

df = pd.read_csv(NEW_DATA_PATH)


def gender_to_int(x):
    x = str(x).strip().lower()
    if x in ["1", "m", "male", "남"]:
        return 1
    if x in ["2", "f", "female", "여"]:
        return 2
    return 0


df["gender"] = df["gender"].apply(gender_to_int)
df["age"] = df["age"].apply(
    lambda x: int(x) if str(x).isdigit() and 0 <= int(x) <= 99 else 0
)
df["purchase_date"] = pd.to_datetime(df["purchase_date"])
df = df.sort_values(["user_id", "purchase_date"])
df["id"] = df["product_id"].astype(str)

print("데이터프레임 로드 성공, shape:", df.shape)

# ===== 구매수 feature만 추가 (row 중복 X) =====
df["user_product_count"] = df.groupby(["user_id", "product_id"])[
    "product_id"
].transform("count")
df["user_product_count"] = np.log1p(df["user_product_count"]) * SCALING_FACTOR


def build_context(seq, window=MAX_CONTEXT_LEN):
    prev = []
    contexts = []
    for pid in seq:
        contexts.append(prev[-window:])
        prev.append(pid)
    return contexts


def pad_list(x, length):
    if not isinstance(x, list):
        x = []
    x = [str(i) for i in x]
    return x[:length] + [""] * (length - len(x))


df["context"] = df.groupby("user_id")["id"].transform(
    lambda x: build_context(x, window=MAX_CONTEXT_LEN)
)
df["context"] = df["context"].apply(lambda x: pad_list(x, MAX_CONTEXT_LEN))

# ===============================
# 3. 기존 vocabulary 불러오기
# ===============================
if not (os.path.exists(ID_LOOKUP_PATH) and os.path.exists(USER_LOOKUP_PATH)):
    raise FileNotFoundError(
        "id_lookup.npy 또는 user_lookup.npy 파일이 없습니다. 초기 학습 후 생성된 파일을 준비해주세요."
    )

product_ids = list(np.load(ID_LOOKUP_PATH))
user_ids = list(np.load(USER_LOOKUP_PATH))

print(f"상품 수: {len(product_ids)}, 사용자 수: {len(user_ids)}")

user_lookup = tf.keras.layers.StringLookup(
    vocabulary=user_ids, mask_token=None, oov_token="[OOV]"
)
context_lookup = tf.keras.layers.StringLookup(
    vocabulary=product_ids, mask_token=None, oov_token="[OOV]"
)
id_lookup = tf.keras.layers.StringLookup(
    vocabulary=product_ids, mask_token=None, oov_token="[OOV]"
)


# ===============================
# 4. tf.data Dataset 생성 (user_product_count 추가)
# ===============================
def preprocess(features):
    return {
        "user_features": {
            "user_idx": user_lookup(features["user_features"]["user_id"]),
            "gender": tf.cast(features["user_features"]["gender"], tf.int32),
            "age": tf.cast(features["user_features"]["age"], tf.int32),
            "context_idx": context_lookup(features["user_features"]["context"]),
        },
        "item_features": {
            "id_idx": id_lookup(features["item_features"]["id"]),
        },
        "user_product_count": tf.cast(features["user_product_count"], tf.float32),
    }


def df_to_tf_dataset(df):
    return tf.data.Dataset.from_tensor_slices(
        {
            "user_features": {
                "user_id": df["user_id"].astype(str).values,
                "gender": df["gender"].astype(np.int32).values,
                "age": df["age"].astype(np.int32).values,
                "context": np.stack(df["context"].values),
            },
            "item_features": {
                "id": df["id"].astype(str).values,
            },
            "user_product_count": df["user_product_count"].astype(np.float32).values,
        }
    )


train_df, _ = train_test_split(df, test_size=0.2, random_state=42)
train_ds = (
    df_to_tf_dataset(train_df)
    .shuffle(1000)
    .batch(BATCH_SIZE)
    .prefetch(tf.data.AUTOTUNE)
)
train_ds_indexed = train_ds.map(preprocess, num_parallel_calls=tf.data.AUTOTUNE)

candidates_ds = (
    tf.data.Dataset.from_tensor_slices(
        {"id_idx": np.arange(len(product_ids), dtype=np.int32)}
    )
    .batch(BATCH_SIZE)
    .map(lambda x: {"id_idx": tf.cast(x["id_idx"], tf.int32)})
)


# ===============================
# 5. 모델 정의 (interaction feature 반영)
# ===============================
class UserModel(tf.keras.Model):
    def __init__(self, num_users, num_products):
        super().__init__()
        self.user_emb = tf.keras.layers.Embedding(num_users + 2, EMBED_DIM)
        self.gender_emb = tf.keras.layers.Embedding(3, 4)
        self.age_emb = tf.keras.layers.Embedding(100, 4)
        self.context_emb = tf.keras.layers.Embedding(num_products + 2, EMBED_DIM)

    def call(self, features):
        u = self.user_emb(features["user_idx"])
        g = self.gender_emb(features["gender"])
        a = self.age_emb(features["age"])
        context = (
            tf.reduce_mean(self.context_emb(features["context_idx"]), axis=1) * 5.0
        )
        return tf.concat([u, g, a, context], axis=-1)


class ItemModel(tf.keras.Model):
    def __init__(self, num_products):
        super().__init__()
        self.emb = tf.keras.layers.Embedding(num_products + 2, EMBED_DIM)

    def call(self, features):
        return self.emb(features["id_idx"])


class TwoTowerModel(tfrs.models.Model):
    def __init__(self, num_users, num_products):
        super().__init__()
        self.query_model = UserModel(num_users, num_products)
        self.candidate_model = ItemModel(num_products)
        self.concat_dense = tf.keras.layers.Dense(EMBED_DIM)
        self.task = tfrs.tasks.Retrieval(
            metrics=tfrs.metrics.FactorizedTopK(
                candidates=candidates_ds.map(self.candidate_model)
            )
        )

    def compute_loss(self, features, training=False):
        user_emb = self.query_model(features["user_features"])
        item_emb = self.candidate_model(features["item_features"])
        interaction = tf.expand_dims(features["user_product_count"], -1)
        concat = tf.concat([user_emb, item_emb, interaction], axis=-1)
        output = self.concat_dense(concat)
        return self.task(output, item_emb)

    def call(self, features):
        user_emb = self.query_model(features["user_features"])
        item_emb = self.candidate_model(features["item_features"])
        interaction = tf.expand_dims(features["user_product_count"], -1)
        concat = tf.concat([user_emb, item_emb, interaction], axis=-1)
        return self.concat_dense(concat)


# ===============================
# 6. 모델 생성 및 컴파일
# ===============================
num_users, num_products = len(user_ids), len(product_ids)
model = TwoTowerModel(num_users, num_products)
model.compile(optimizer=tf.keras.optimizers.Adagrad(1))  # 러닝레이트 최대로

# ===============================
# 7. 모델 빌드(변수 생성) 및 가중치 로드
# ===============================
dummy_input = {
    "user_features": {
        "user_idx": tf.constant([0], dtype=tf.int32),
        "gender": tf.constant([0], dtype=tf.int32),
        "age": tf.constant([0], dtype=tf.int32),
        "context_idx": tf.constant([[0] * MAX_CONTEXT_LEN], dtype=tf.int32),
    },
    "item_features": {
        "id_idx": tf.constant([0], dtype=tf.int32),
    },
    "user_product_count": tf.constant([0.0], dtype=tf.float32),
}
_ = model(dummy_input)
print("가중치 불러오기:", KERAS_WEIGHTS_PATH)
model.load_weights(KERAS_WEIGHTS_PATH)

# ===============================
# 8. 추가 학습 (tqdm으로 진행률, 배치별 loss 출력)
# ===============================
print("\n[추가 학습 시작]")
for epoch in range(EPOCHS):
    print(f"\n===== [Epoch {epoch + 1}/{EPOCHS}] =====")
    total_batches = tf.data.experimental.cardinality(train_ds_indexed).numpy()
    avg_loss = 0
    with tqdm(train_ds_indexed, total=total_batches, desc=f"Epoch {epoch+1}") as pbar:
        for batch_idx, batch in enumerate(pbar):
            with tf.GradientTape() as tape:
                loss = model.compute_loss(batch, training=True)
            grads = tape.gradient(loss, model.trainable_variables)
            model.optimizer.apply_gradients(zip(grads, model.trainable_variables))
            avg_loss += float(loss)
            pbar.set_postfix(batch=batch_idx + 1, loss=float(loss))
    avg_loss /= total_batches
    print(f"Epoch {epoch+1} 종료. 평균 Loss: {avg_loss:.4f}")
print("[추가 학습 종료]")

# ===============================
# 9. 가중치 저장
# ===============================
model.save_weights(KERAS_WEIGHTS_PATH)
print("가중치 저장 완료.")

# ===============================
# 10. ONNX 변환
# ===============================
print("ONNX 모델 변환 시작...")
model_proto, _ = tf2onnx.convert.from_keras(model, output_path=ONNX_MODEL_PATH)
print("ONNX 모델 변환 완료:", ONNX_MODEL_PATH)

# ===============================
# 11. ONNX 양자화 (Dynamic Quantize)
# ===============================
print("ONNX 모델 양자화 시작...")
quantize_dynamic(ONNX_MODEL_PATH, QUANTIZED_MODEL_PATH, weight_type=QuantType.QInt8)
print("ONNX 모델 양자화 완료:", QUANTIZED_MODEL_PATH)
