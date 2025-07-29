import numpy as np
import onnxruntime as ort
import json
import os

# ------- (1) 모델과 vocab 로드 (최초 1회만) -------
BASE = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),  # 현재: models/
        "..",  # app/
        "..",  # fastapi-ai-recommender/
        "..",  # ai/
        "parameters",
        "member_model",
    )
)
user_lookup = np.load(os.path.join(BASE, "user_lookup.npy"))
context_lookup = np.load(os.path.join(BASE, "context_lookup.npy"))
item_embs = np.load(os.path.join(BASE, "item_embeddings.npy"))
with open(os.path.join(BASE, "id2title.json"), encoding="utf-8") as f:
    id2title = json.load(f)

session = ort.InferenceSession(os.path.join(BASE, "model_quantized.onnx"))


def to_idx(val, vocab):
    idx = np.where(vocab == val)[0]
    return int(idx[0]) if len(idx) > 0 else 0


def recommend(
    user_id, gender, age, cart=None, wish_list=None, topk=5, context_weight=5.0
):
    MAX_CONTEXT_LEN = 5
    cart = cart if cart else []
    wish_list = wish_list if wish_list else []
    # cart, wish_list 합치고 중복 제거
    context = list(dict.fromkeys(cart + wish_list))
    # 길이 맞춰 패딩
    context = (context + [""] * MAX_CONTEXT_LEN)[:MAX_CONTEXT_LEN]

    # 각 feature를 index로 변환
    user_idx = np.array([to_idx(user_id, user_lookup)], dtype=np.int32)
    context_idx = np.array(
        [[to_idx(x, context_lookup) for x in context]], dtype=np.int32
    )  # (1, 5)
    gender_idx = np.array([int(gender)], dtype=np.int32)
    age_idx = np.array([int(age)], dtype=np.int32)

    # ONNX 입력: user_idx, context_idx, gender, age
    inputs = {
        "args_0": user_idx,
        "args_0_1": context_idx,
        "args_0_2": gender_idx,
        "args_0_3": age_idx,
    }

    # ------- (3) ONNX 추론 -------
    outputs = session.run(None, inputs)
    user_vec = outputs[0][0]  # (임베딩 32차원)

    # ⭐️ context 가중치 적용(실험적): context 벡터 부분만 곱하기
    # 만약 user_vec이 [user, gender, age, context]로 concat된 구조라면 아래와 같이...
    # context는 마지막 EMBED_DIM 길이 (예: EMBED_DIM=32면 맨 끝 32차원)
    EMBED_DIM = user_vec.shape[0] // 4  # 예: 128차원이면 32씩 4개
    # [user, gender, age, context] 구조를 가정
    user_vec[-EMBED_DIM:] *= context_weight  # context 부분만 곱하기

    # ------- (4) 내적 및 추천 -------
    scores = item_embs @ user_vec
    topk_candidates = 100
    topk_idx = np.argsort(scores)[::-1][:topk_candidates]
    candidate_ids = [context_lookup[idx] for idx in topk_idx]

    # context(빈 값 제외)로 필터링
    exclude_set = set([x for x in context if x])
    filtered_ids = [pid for pid in candidate_ids if pid not in exclude_set]

    final_ids = filtered_ids[:topk]

    results = []
    for pid in final_ids:
        idx = np.where(context_lookup == pid)[0]
        score = float(scores[idx[0]]) if len(idx) > 0 else 0.0
        title = id2title.get(pid, "Unknown")
        results.append({"asin": pid, "title": title, "score": score})
    return results
