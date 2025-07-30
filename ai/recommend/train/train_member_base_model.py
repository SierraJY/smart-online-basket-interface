import os
import shutil
import pandas as pd
import numpy as np
import tensorflow as tf
import tensorflow_recommenders as tfrs
from sklearn.model_selection import train_test_split
import json

# ===============================
# 1. 경로 설정
# ===============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_PATH = os.path.join(BASE_DIR, "user_id_id_name_sim08.jsonl")
CONTEXT_LOOKUP_PATH = os.path.join(BASE_DIR, "context_lookup.npy")
ID_LOOKUP_PATH = os.path.join(BASE_DIR, "id_lookup.npy")
USER_LOOKUP_PATH = os.path.join(BASE_DIR, "user_lookup.npy")
ITEM_LOOKUP_PATH = os.path.join(BASE_DIR, "item_lookup.npy")  # 추가!
ID2TITLE_PATH = os.path.join(BASE_DIR, "id2title.json")

SAVED_MODEL_PATH = os.path.join(BASE_DIR, "serving_model")
KERAS_WEIGHTS_PATH = os.path.join(BASE_DIR, "two_tower_weights.h5")
ITEM_EMB_PATH = os.path.join(BASE_DIR, "item_embeddings.npy")

MAX_CONTEXT_LEN = 10
BATCH_SIZE = 64
EPOCHS = 1
EMBED_DIM = 32

# --- 기존 모델/파일 충돌 방지 ---
for path in [SAVED_MODEL_PATH, KERAS_WEIGHTS_PATH, ITEM_EMB_PATH]:
    if os.path.exists(path):
        if os.path.isfile(path):
            os.remove(path)
        else:
            shutil.rmtree(path, ignore_errors=True)

# ===============================
# 2. 데이터 로딩 및 전처리
# ===============================
df = pd.read_json(DATA_PATH, lines=True)
print(f"Loaded df.shape: {df.shape}")


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

product_ids = list(dict.fromkeys(df["id"].astype(str).tolist()))
user_ids = list(dict.fromkeys(df["user_id"].astype(str).tolist()))

# ===============================
# 3. vocab 및 매핑 저장 (item_lookup 포함!)
# ===============================
np.save(CONTEXT_LOOKUP_PATH, np.array(product_ids))
np.save(ID_LOOKUP_PATH, np.array(product_ids))
np.save(USER_LOOKUP_PATH, np.array(user_ids))
np.save(ITEM_LOOKUP_PATH, np.array(product_ids))  # <-- 추가! (id와 동일한 순서)

if "clean_title_ko" in df.columns:
    title_lookup = {row["id"]: row["clean_title_ko"] for _, row in df.iterrows()}
else:
    title_lookup = {row["id"]: row.get("name", "") for _, row in df.iterrows()}

with open(ID2TITLE_PATH, "w", encoding="utf-8") as f:
    json.dump(title_lookup, f, ensure_ascii=False, indent=2)

# ===============================
# 4. tf.data Dataset 생성
# ===============================
train_df, _ = train_test_split(df, test_size=0.2, random_state=42)


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


# ===============================
# 5. 모델 정의
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

# ===============================
# 6. 모델 학습
# ===============================
print("\n[모델 학습 시작]")
for epoch in range(EPOCHS):
    print(f"\n===== [Epoch {epoch + 1}/{EPOCHS}] =====")
    model.fit(train_ds_indexed, epochs=1, verbose=2)
print("[모델 학습 종료]")

# ===============================
# 7. Keras 빌드 및 가중치 저장
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
}
_ = model(dummy_input)  # 빌드, 변수 생성

model.save_weights(KERAS_WEIGHTS_PATH)
print(f"✅ Keras 가중치 저장 완료 → {KERAS_WEIGHTS_PATH}")


# ===============================
# 8. Serving 모델 정의 및 저장
# ===============================
class ServingModel(tf.keras.Model):
    def __init__(self, user_model, proj):
        super().__init__()
        self.user_model = user_model
        self.proj = proj

    @tf.function(
        input_signature=[
            {
                "user_idx": tf.TensorSpec([None], tf.int32),
                "gender": tf.TensorSpec([None], tf.int32),
                "age": tf.TensorSpec([None], tf.int32),
                "context_idx": tf.TensorSpec([None, MAX_CONTEXT_LEN], tf.int32),
            }
        ]
    )
    def call(self, features):
        u = self.user_model.user_emb(features["user_idx"])
        g = self.user_model.gender_emb(features["gender"])
        a = self.user_model.age_emb(features["age"])
        context = (
            tf.reduce_mean(self.user_model.context_emb(features["context_idx"]), axis=1)
            * 5.0
        )
        return self.proj(tf.concat([u, g, a, context], axis=-1))


serving_model = ServingModel(model.query_model, model.query_proj)
_ = serving_model(
    {
        "user_idx": tf.constant([0], dtype=tf.int32),
        "gender": tf.constant([0], dtype=tf.int32),
        "age": tf.constant([0], dtype=tf.int32),
        "context_idx": tf.constant([[0] * MAX_CONTEXT_LEN], dtype=tf.int32),
    }
)

tf.saved_model.save(serving_model, SAVED_MODEL_PATH)
print(f"✅ 서빙 모델 저장 완료 → {SAVED_MODEL_PATH}")

# ===============================
# 9. 임베딩 저장
# ===============================
item_embs = model.candidate_model(
    {"id_idx": tf.constant(np.arange(num_products), dtype=tf.int32)}
).numpy()
np.save(ITEM_EMB_PATH, item_embs)

# ===============================
# 10. item_lookup 별도 저장 (안전)
# ===============================
np.save(ITEM_LOOKUP_PATH, np.array(product_ids))
print(f"✅ item_lookup.npy 저장 완료! 총 {len(product_ids)}개")

print("\n[id, 임베딩, clean_title_ko 매칭 샘플]")
for i in range(3):
    pid = product_ids[i]
    print(f"  {i}: {pid} → '{title_lookup.get(pid, pid)}' / emb[:5]={item_embs[i, :5]}")
