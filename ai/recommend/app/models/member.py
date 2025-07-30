import numpy as np
import onnxruntime as ort
import os
import json

# 기본 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "parameters", "member_model")

# 필요한 파일 로딩
user_lookup = np.load(os.path.join(MODEL_DIR, "user_lookup.npy"))
context_lookup = np.load(os.path.join(MODEL_DIR, "context_lookup.npy"))
item_lookup = np.load(os.path.join(MODEL_DIR, "item_lookup.npy"))
item_embs = np.load(os.path.join(MODEL_DIR, "item_embeddings.npy"))

# ONNX 모델 로드
session = ort.InferenceSession(
    os.path.join(MODEL_DIR, "two_tower_model_quantized.onnx")
)


# 값 → index 변환 함수
def to_idx(val, vocab):
    idx = np.where(vocab == val)[0]
    return int(idx[0]) if len(idx) > 0 else 0


# 추천 함수
def recommend(
    user_id, gender, age, cart=None, wishlist=None, topk=5, context_weight=5.0
):
    MAX_CONTEXT_LEN = 10
    cart = cart if cart else []
    wishlist = wishlist if wishlist else []

    context = list(dict.fromkeys(cart + wishlist))
    context = (context + [""] * MAX_CONTEXT_LEN)[:MAX_CONTEXT_LEN]

    context = list(dict.fromkeys(cart + wishlist))
    context = (context + [""] * MAX_CONTEXT_LEN)[:MAX_CONTEXT_LEN]

    user_idx = np.array([to_idx(user_id, user_lookup)], dtype=np.int32)
    context_idx = np.array(
        [[to_idx(x, context_lookup) for x in context]], dtype=np.int32
    )

    gender_idx = np.array([int(gender)], dtype=np.int32)
    age_idx = np.array([int(age)], dtype=np.int32)

    inputs = {
        "user_features_user_idx": user_idx,
        "user_features_context_idx": context_idx,
        "user_features_gender": gender_idx,
        "user_features_age": age_idx,
        "item_features_id_idx": np.zeros((1,), dtype=np.int32),  # 더미
    }

    outputs = session.run(None, inputs)
    user_vec = outputs[0][0]

    EMBED_DIM = user_vec.shape[0] // 4
    user_vec[-EMBED_DIM:] *= context_weight

    scores = item_embs @ user_vec
    topk_candidates = 100
    topk_idx = np.argsort(scores)[::-1][:topk_candidates]
    candidate_ids = [context_lookup[idx] for idx in topk_idx]

    exclude_set = set([x for x in context if x])
    filtered_ids = [pid for pid in candidate_ids if pid not in exclude_set]
    final_ids = filtered_ids[:topk]

    return {
        "user_id": user_id,
        "recommendations": [str(pid) for pid in final_ids],
    }
