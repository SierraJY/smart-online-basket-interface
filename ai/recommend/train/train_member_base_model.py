import os
import shutil
import pandas as pd
import numpy as np
import tensorflow as tf
import tensorflow_recommenders as tfrs
from sklearn.model_selection import train_test_split
import json

# ===============================
# 1. 경로 및 파일/설정
# ===============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CSV_PATH = os.path.join(BASE_DIR, "purchased_history.csv")
CONTEXT_LOOKUP_PATH = os.path.join(BASE_DIR, "context_lookup.npy")
ID_LOOKUP_PATH = os.path.join(BASE_DIR, "id_lookup.npy")
USER_LOOKUP_PATH = os.path.join(BASE_DIR, "user_lookup.npy")
ITEM_LOOKUP_PATH = os.path.join(BASE_DIR, "item_lookup.npy")
ID2TITLE_PATH = os.path.join(BASE_DIR, "id2title.json")

SAVED_MODEL_PATH = os.path.join(BASE_DIR, "serving_model")
KERAS_WEIGHTS_PATH = os.path.join(BASE_DIR, "two_tower_weights.h5")
ITEM_EMB_PATH = os.path.join(BASE_DIR, "item_embeddings.npy")

MAX_CONTEXT_LEN = 10
BATCH_SIZE = 64
EPOCHS = 1
EMBED_DIM = 32

for path in [SAVED_MODEL_PATH, KERAS_WEIGHTS_PATH, ITEM_EMB_PATH]:
    if os.path.exists(path):
        if os.path.isfile(path):
            os.remove(path)
        else:
            shutil.rmtree(path, ignore_errors=True)

# ===============================
# 2. 데이터 로딩 및 전처리
# ===============================
df = pd.read_csv(CSV_PATH)  # 헤더 있음


def gender_to_int(x):
    x = str(x).strip().lower()
    if x in ["1", "m", "male", "남"]:
        return 1
    if x in ["2", "f", "female", "여"]:
        return 2
    return 0


df["gender"] = df["gender"].apply(gender_to_int)
df["age"] = df["age"].apply(lambda x: int(x) if str(x).isdigit() else 0)
df["purchase_date"] = pd.to_datetime(df["purchase_date"])
df["id"] = df["product_id"].astype(str)
df["name"] = df["product_name"]

# 상호작용 feature 추가
df["user_product_count"] = df.groupby(["user_id", "product_id"])[
    "product_id"
].transform("count")
df["user_product_count"] = np.log1p(df["user_product_count"])


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
    lambda x: build_context(x, MAX_CONTEXT_LEN)
)
df["context"] = df["context"].apply(lambda x: pad_list(x, MAX_CONTEXT_LEN))

product_ids = list(dict.fromkeys(df["id"].tolist()))
user_ids = list(dict.fromkeys(df["user_id"].tolist()))

np.save(CONTEXT_LOOKUP_PATH, np.array(product_ids))
np.save(ID_LOOKUP_PATH, np.array(product_ids))
np.save(USER_LOOKUP_PATH, np.array(user_ids))
np.save(ITEM_LOOKUP_PATH, np.array(product_ids))

title_lookup = {row["id"]: row["name"] for _, row in df.iterrows()}
with open(ID2TITLE_PATH, "w", encoding="utf-8") as f:
    json.dump(title_lookup, f, ensure_ascii=False, indent=2)

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
            "user_product_count": df["user_product_count"].astype(np.float32).values,
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
        "user_product_count": tf.cast(features["user_product_count"], tf.float32),
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


num_users, num_products = len(user_ids), len(product_ids)
model = TwoTowerModel(num_users, num_products)
model.compile(optimizer=tf.keras.optimizers.Adagrad(0.1))

print("\n[모델 학습 시작]")
for epoch in range(EPOCHS):
    print(f"\n===== [Epoch {epoch + 1}/{EPOCHS}] =====")
    model.fit(train_ds_indexed, epochs=1, verbose=2)
print("[모델 학습 종료]")

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
model.save_weights(KERAS_WEIGHTS_PATH)
print(f"✅ Keras 가중치 저장 완료 → {KERAS_WEIGHTS_PATH}")


# ===============================
# 8. Serving 모델 정의 및 저장 (interaction feature 포함)
# ===============================
class ServingModel(tf.keras.Model):
    def __init__(self, user_model, item_model, concat_dense):
        super().__init__()
        self.user_model = user_model
        self.item_model = item_model
        self.concat_dense = concat_dense

    @tf.function(
        input_signature=[
            {
                "user_idx": tf.TensorSpec([None], tf.int32),
                "gender": tf.TensorSpec([None], tf.int32),
                "age": tf.TensorSpec([None], tf.int32),
                "context_idx": tf.TensorSpec([None, MAX_CONTEXT_LEN], tf.int32),
                "item_idx": tf.TensorSpec([None], tf.int32),
                "user_product_count": tf.TensorSpec([None], tf.float32),
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
        user_emb = tf.concat([u, g, a, context], axis=-1)
        item_emb = self.item_model.emb(features["item_idx"])
        interaction = tf.expand_dims(features["user_product_count"], -1)
        concat = tf.concat([user_emb, item_emb, interaction], axis=-1)
        return self.concat_dense(concat)


serving_model = ServingModel(
    model.query_model, model.candidate_model, model.concat_dense
)
_ = serving_model(
    {
        "user_idx": tf.constant([0], dtype=tf.int32),
        "gender": tf.constant([0], dtype=tf.int32),
        "age": tf.constant([0], dtype=tf.int32),
        "context_idx": tf.constant([[0] * MAX_CONTEXT_LEN], dtype=tf.int32),
        "item_idx": tf.constant([0], dtype=tf.int32),
        "user_product_count": tf.constant([0.0], dtype=tf.float32),
    }
)
tf.saved_model.save(serving_model, SAVED_MODEL_PATH)
print(f"✅ 서빙 모델 저장 완료 → {SAVED_MODEL_PATH}")

# ===============================
# 9. 임베딩 저장 (item tower만, pair feature 없이!)
# ===============================
item_embs = model.candidate_model(
    {"id_idx": tf.constant(np.arange(num_products), dtype=tf.int32)}
).numpy()
np.save(ITEM_EMB_PATH, item_embs)

np.save(ITEM_LOOKUP_PATH, np.array(product_ids))
print(f"✅ item_lookup.npy 저장 완료! 총 {len(product_ids)}개")

print("\n[id, 임베딩, name 매칭 샘플]")
for i in range(3):
    pid = product_ids[i]
    print(f"  {i}: {pid} → '{title_lookup.get(pid, pid)}' / emb[:5]={item_embs[i, :5]}")

# ===============================
# 10. user666 추천 Top 10 직접 확인 (상호작용 반영)
# ===============================
print("\n\n==== [user666 Top 10 추천 score 체크] ====")
user_id = "user666"
gender_idx = 1  # 실제 값
age_idx = 22  # 실제 값

user_idx = user_lookup([user_id]).numpy()[0]
context_idx = [[0] * MAX_CONTEXT_LEN]  # context 없음

# 각 상품마다 user-product count feature를 구해주어야 함
user_666_df = df[df["user_id"] == user_id]
user_666_product_count = []
for pid in product_ids:
    v = user_666_df[user_666_df["id"] == pid]["user_product_count"]
    user_666_product_count.append(float(v.values[0]) if len(v) > 0 else 0.0)

user_scores = serving_model(
    {
        "user_idx": tf.constant([user_idx] * len(product_ids), dtype=tf.int32),
        "gender": tf.constant([gender_idx] * len(product_ids), dtype=tf.int32),
        "age": tf.constant([age_idx] * len(product_ids), dtype=tf.int32),
        "context_idx": tf.constant([context_idx[0]] * len(product_ids), dtype=tf.int32),
        "item_idx": tf.constant(np.arange(len(product_ids)), dtype=tf.int32),
        "user_product_count": tf.constant(user_666_product_count, dtype=tf.float32),
    }
).numpy()
scores = user_scores @ np.ones(
    user_scores.shape[1]
)  # (num_items, EMBED_DIM) × (EMBED_DIM,) -> (num_items,)

topk_idx = np.argsort(scores)[::-1][:10]
print(f"\nuser666 추천 Top 10")
for i in topk_idx:
    print(f"{product_ids[i]}: {title_lookup[product_ids[i]]}, score={scores[i]:.4f}")

print("\n\n==== [user666 추천 품목 디버깅 분석] ====")
print("\n[1] user666 실제 구매 Top 10 품목")
print(user_666_df["product_name"].value_counts().head(10))

print("\n[2] user666 실제 gender/age 값 (중복제거)")
print(user_666_df[["gender", "age"]].drop_duplicates())

print(
    "\n[3] 추천 Top 10 내에 '제로 1.8L' 존재 여부 및 전체 상품 중 '제로 1.8L' 점수/랭킹"
)
zero_idxs = []
for idx, pid in enumerate(product_ids):
    pname = title_lookup.get(pid, "")
    if "제로 1.8L" in pname:
        zero_idxs.append(idx)
if not zero_idxs:
    print("!! 데이터셋에 '제로 1.8L' 상품 없음 !!")
else:
    for idx in zero_idxs:
        pname = title_lookup[product_ids[idx]]
        score = scores[idx]
        rank = (scores > score).sum() + 1
        print(
            f"제로 1.8L 후보 - {product_ids[idx]}: '{pname}' | score={score:.4f} | 전체 랭킹={rank}"
        )

print("\n[4] user666 전체 구매 상품 분포 (상위 20)")
print(user_666_df["product_name"].value_counts().head(20))
