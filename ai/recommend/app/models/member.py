import numpy as np
import onnxruntime as ort
import os
import pickle

# ===============================
# 경로 및 파일 로딩
# ===============================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "parameters", "member_model")

user_lookup = np.load(os.path.join(MODEL_DIR, "user_lookup.npy"))
context_lookup = np.load(os.path.join(MODEL_DIR, "context_lookup.npy"))
item_lookup = np.load(os.path.join(MODEL_DIR, "item_lookup.npy"))
item_embs = np.load(os.path.join(MODEL_DIR, "item_embeddings.npy"))

# user-product-count 딕셔너리(pkl) 로딩
with open(os.path.join(MODEL_DIR, "user_product_count.pkl"), "rb") as f:
    user_product_count_dict = pickle.load(f)

session = ort.InferenceSession(
    os.path.join(MODEL_DIR, "two_tower_model_quantized.onnx")
)


def to_idx(val, vocab):
    idx = np.where(vocab == val)[0]
    return int(idx[0]) if len(idx) > 0 else 0


def get_user_product_count(user_id, product_id):
    # 없는 유저/상품이면 0.0 반환
    return float(user_product_count_dict.get(user_id, {}).get(product_id, 0.0))


def recommend(
    user_id, gender, age, cart=None, wishlist=None, topk=10, context_weight=5.0
):
    MAX_CONTEXT_LEN = 10
    cart = cart or []
    wishlist = wishlist or []

    # context: cart + wishlist (중복 제거, MAX_CONTEXT_LEN만큼 패딩)
    context = list(dict.fromkeys(cart + wishlist))
    context = (context + [""] * MAX_CONTEXT_LEN)[:MAX_CONTEXT_LEN]

    user_idx = np.array([to_idx(user_id, user_lookup)], dtype=np.int32)
    context_idx = np.array(
        [[to_idx(x, context_lookup) for x in context]], dtype=np.int32
    )
    gender_idx = np.array([int(gender)], dtype=np.int32)
    age_idx = np.array([int(age)], dtype=np.int32)

    # 모든 아이템 후보에 대해 user-product-count feature 생성
    all_item_indices = np.arange(len(item_lookup))
    all_item_ids = [item_lookup[idx] for idx in all_item_indices]
    user_product_count_arr = np.array(
        [get_user_product_count(user_id, str(pid)) for pid in all_item_ids],
        dtype=np.float32,
    )

    # ONNX 모델 입력 준비 (배치 전체 아이템)
    inputs = {
        "user_features_user_idx": np.repeat(user_idx, len(all_item_ids), axis=0),
        "user_features_context_idx": np.repeat(context_idx, len(all_item_ids), axis=0),
        "user_features_gender": np.repeat(gender_idx, len(all_item_ids), axis=0),
        "user_features_age": np.repeat(age_idx, len(all_item_ids), axis=0),
        "item_features_id_idx": all_item_indices.astype(np.int32),
        "user_product_count": user_product_count_arr,  # <--- 추가됨!
    }
    # ONNX 추론
    outputs = session.run(None, inputs)
    # (배치, EMBED_DIM) 구조일 경우, 평탄화해서 점수 산출
    user_scores = outputs[0]  # shape: (num_items, EMBED_DIM)
    # 간단 내적(총합) 점수
    scores = user_scores @ np.ones(user_scores.shape[1])

    # 상위 topk_candidates 추출, context(장바구니) 제외
    topk_candidates = 100
    topk_idx = np.argsort(scores)[::-1][:topk_candidates]
    candidate_ids = [item_lookup[idx] for idx in topk_idx]
    exclude_set = set([x for x in context if x])
    filtered_ids = [pid for pid in candidate_ids if pid not in exclude_set]
    final_ids = filtered_ids[:topk]

    return {
        "user_id": user_id,
        "recommendations": [str(pid) for pid in final_ids],
    }


# (예시) 단독 실행 시 테스트
if __name__ == "__main__":
    result = recommend(
        user_id="user666",
        gender=1,
        age=22,
        cart=[],
        wishlist=[],
        topk=30,
        context_weight=5.0,
    )
    print(result)
