import os
import pandas as pd
import numpy as np
import tensorflow as tf
import tensorflow_recommenders as tfrs
from sklearn.model_selection import train_test_split
import tf2onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

# === [PostgreSQL에서 데이터 불러오기] ===
import psycopg2

DB_HOST = "DB_HOST"
DB_PORT = 5432
DB_USER = "DB_USER"
DB_PASSWORD = "DB_PASSWORD"
DB_NAME = "DB_NAME"

print("DB에서 추가 학습용 구매내역 데이터 쿼리 중...")
conn = psycopg2.connect(
    host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=DB_NAME
)
sql = """
SELECT 
    user_id,        -- 유저ID (str)
    id,             -- 상품ID (str)
    gender,         -- (옵션) 성별 (M/F/1/2)
    age,            -- (옵션) 나이 (int)
    timestamp       -- 구매 시각 (int, timestamp 등)
FROM 
    purchase_history
WHERE
    timestamp BETWEEN '2024-01-01' AND '2024-12-31'
"""
df = pd.read_sql(sql, conn)
conn.close()
print("DB에서 데이터프레임 로드 성공, shape:", df.shape)

# ===============================
# 이하 기존 코드 그대로!
# ===============================

MAX_CONTEXT_LEN = 10
BATCH_SIZE = 64
EPOCHS = 1
EMBED_DIM = 32

SAVED_MODEL_PATH = "serving_model"
KERAS_WEIGHTS_PATH = "two_tower_weights.h5"
ONNX_MODEL_PATH = "two_tower_model.onnx"
QUANTIZED_MODEL_PATH = "two_tower_model_quantized.onnx"


def gender_to_int(x):
    if x in [1, "1", "M", "m", "남", "male"]:
        return 1
    if x in [2, "2", "F", "f", "여", "female"]:
        return 2
    return 0


if "gender" not in df.columns:
    df["gender"] = 0
df["gender"] = df["gender"].apply(gender_to_int)

if "age" not in df.columns:
    df["age"] = 0
df["age"] = df["age"].apply(
    lambda x: int(x) if str(x).isdigit() and 0 <= int(x) <= 99 else 0
)

if "timestamp" in df.columns:
    df = df.sort_values(["user_id", "timestamp"])
else:
    df = df.sort_values("user_id")


def build_context(seq, window=MAX_CONTEXT_LEN):
    prev = []
    contexts = []
    for pid in seq:
        contexts.append(prev[-window:])
        prev.append(pid)
    return contexts


df["context"] = df.groupby("user_id")["id"].transform(
    lambda x: build_context(x, window=MAX_CONTEXT_LEN)
)


def pad_list(x, length):
    if not isinstance(x, list):
        x = []
    x = [str(i) for i in x]
    return x[:length] + [""] * (length - len(x))


df["context"] = df["context"].apply(lambda x: pad_list(x, MAX_CONTEXT_LEN))

if not (os.path.exists("id_lookup.npy") and os.path.exists("user_lookup.npy")):
    raise FileNotFoundError(
        "id_lookup.npy 또는 user_lookup.npy 파일이 없습니다. 초기 학습 후 생성된 파일을 준비해주세요."
    )

product_ids = list(np.load("id_lookup.npy"))
user_ids = list(np.load("user_lookup.npy"))

print(f"상품 수: {len(product_ids)}, 사용자 수: {len(user_ids)}")


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
        }
    )


train_df, _ = train_test_split(df, test_size=0.2, random_state=42)
train_ds = df_to_tf_dataset(train_df).shuffle(1000).batch(BATCH_SIZE).prefetch(1)

user_lookup = tf.keras.layers.StringLookup(
    vocabulary=user_ids, mask_token=None, oov_token="[OOV]"
)
context_lookup = tf.keras.layers.StringLookup(
    vocabulary=product_ids, mask_token=None, oov_token="[OOV]"
)
id_lookup = tf.keras.layers.StringLookup(
    vocabulary=product_ids, mask_token=None, oov_token="[OOV]"
)


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
    }


train_ds_indexed = train_ds.map(preprocess)

candidates_ds = (
    tf.data.Dataset.from_tensor_slices(
        {"id_idx": np.arange(len(product_ids), dtype=np.int32)}
    )
    .batch(BATCH_SIZE)
    .map(lambda x: {"id_idx": tf.cast(x["id_idx"], tf.int32)})
)


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
        self.query_proj = tf.keras.layers.Dense(EMBED_DIM)
        self.task = tfrs.tasks.Retrieval(
            metrics=tfrs.metrics.FactorizedTopK(
                candidates=candidates_ds.map(self.candidate_model)
            )
        )

    def compute_loss(self, features, training=False):
        user_emb = self.query_proj(self.query_model(features["user_features"]))
        item_emb = self.candidate_model(features["item_features"])
        return self.task(user_emb, item_emb)

    def call(self, features):
        return self.query_proj(self.query_model(features["user_features"]))


num_users, num_products = len(user_ids), len(product_ids)
model = TwoTowerModel(num_users, num_products)
model.compile(optimizer=tf.keras.optimizers.Adagrad(0.1))

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
}
_ = model(dummy_input)  # 반드시 먼저 호출해서 변수 생성

print("가중치 불러오기:", KERAS_WEIGHTS_PATH)
model.load_weights(KERAS_WEIGHTS_PATH)

print("\n[추가 학습 시작]")
for epoch in range(EPOCHS):
    print(f"\n===== [Epoch {epoch + 1}/{EPOCHS}] =====")
    model.fit(train_ds_indexed, epochs=1, verbose=2)
print("[추가 학습 종료]")

model.save_weights(KERAS_WEIGHTS_PATH)
print("가중치 저장 완료.")

print("ONNX 모델 변환 시작...")
model_proto, _ = tf2onnx.convert.from_keras(model, output_path=ONNX_MODEL_PATH)
print("ONNX 모델 변환 완료:", ONNX_MODEL_PATH)

print("ONNX 모델 양자화 시작...")
quantize_dynamic(ONNX_MODEL_PATH, QUANTIZED_MODEL_PATH, weight_type=QuantType.QInt8)
print("ONNX 모델 양자화 완료:", QUANTIZED_MODEL_PATH)
