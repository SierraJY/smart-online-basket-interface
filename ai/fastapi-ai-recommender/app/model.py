import onnxruntime as ort
import numpy as np
import json
from app import utils

# 전역 변수로 ONNX 모델, 임베딩 등 로드
session = ort.InferenceSession("app/model_quantized.onnx")
item_embs = np.load("app/item_embeddings.npy")
user_lookup = np.load("app/user_lookup.npy")
cart_lookup = np.load("app/cart_lookup.npy")
gender_lookup = np.load("app/gender_lookup.npy")
with open("app/asin2title.json", encoding="utf-8") as f:
    asin2title = json.load(f)


def recommend(user_id, gender, age, cart, topk=5):
    # 인덱스 변환
    user_idx = np.array([utils.to_idx(user_id, user_lookup)], dtype=np.float32)
    cart_idx = np.array([[utils.to_idx(x, cart_lookup) for x in cart]], dtype=np.int32)
    gender_idx = np.array([utils.to_idx(gender, gender_lookup)], dtype=np.int32)
    age_arr = np.array([age], dtype=np.int32)
    # ONNX 추론
    inputs = {
        "args_0": user_idx,
        "args_0_1": cart_idx,
        "args_0_2": gender_idx,
        "args_0_3": age_arr,
    }
    outputs = session.run(None, inputs)
    user_vec = outputs[0][0]
    # 유사도 계산
    scores = item_embs @ user_vec
    topk_idx = np.argsort(scores)[::-1][:topk]
    # 추천 결과 조립
    recommendations = []
    for idx in topk_idx:
        asin = cart_lookup[idx]
        title = asin2title.get(asin, "Unknown")
        recommendations.append({"asin": asin, "title": title})
    return {"recommendations": recommendations}
