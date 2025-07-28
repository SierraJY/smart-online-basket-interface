import numpy as np
import onnxruntime as ort
import json
import os

# ------- (1) 모델과 vocab 로드 (최초 1회만) -------
BASE = os.path.dirname(__file__)
user_lookup = np.load(os.path.join(BASE, "user_lookup.npy"))
cart_lookup = np.load(os.path.join(BASE, "cart_lookup.npy"))
wishlist_lookup = np.load(os.path.join(BASE, "wishlist_lookup.npy"))
gender_lookup = np.load(os.path.join(BASE, "gender_lookup.npy"))
item_embs = np.load(os.path.join(BASE, "item_embeddings.npy"))
with open(os.path.join(BASE, "asin2title.json"), encoding="utf-8") as f:
    asin2title = json.load(f)

session = ort.InferenceSession(os.path.join(BASE, "model_quantized.onnx"))


def to_idx(val, vocab):
    idx = np.where(vocab == val)[0]
    return int(idx[0]) if len(idx) > 0 else 0


# ------- (2) 추천 함수 -------
def recommend(user_id, gender, age, cart=None, wishlist=None, topk=5):
    # 빈값 대응
    cart = cart if cart is not None else []
    wishlist = wishlist if wishlist is not None else []

    # 길이 맞춰 패딩
    MAX_CART_LEN = 5
    MAX_WISHLIST_LEN = 5
    cart = (cart + [""] * MAX_CART_LEN)[:MAX_CART_LEN]
    wishlist = (wishlist + [""] * MAX_WISHLIST_LEN)[:MAX_WISHLIST_LEN]

    # 각 feature를 index로 변환
    user_idx = np.array([to_idx(user_id, user_lookup)], dtype=np.float32)  # float32!
    cart_idx = np.array([[to_idx(x, cart_lookup) for x in cart]], dtype=np.int32)
    gender_idx = np.array([to_idx(gender, gender_lookup)], dtype=np.int32)
    age_idx = np.array([age], dtype=np.int32)
    wishlist_idx = np.array(
        [[to_idx(x, wishlist_lookup) for x in wishlist]], dtype=np.int32
    )

    # 입력 dict (ONNX 입력 이름 맞춰야 함!)
    inputs = {
        "args_0": user_idx,  # float32
        "args_0_1": cart_idx,  # int32
        "args_0_2": gender_idx,  # int32
        "args_0_3": age_idx,  # int32
        "args_0_4": wishlist_idx,  # int32
    }

    # ----- 디버깅용: 입력이름/타입/shape 확인 -----
    # for inp in session.get_inputs():
    #     print(f"name: {inp.name}, type: {inp.type}, shape: {inp.shape}")

    # ------- (3) ONNX 추론 및 추천 -------
    outputs = session.run(None, inputs)
    user_vec = outputs[0][0]
    scores = item_embs @ user_vec
    topk_idx = np.argsort(scores)[::-1][:topk]

    # ------- (4) 추천 결과 리턴 -------
    results = []
    for idx in topk_idx:
        asin = str(cart_lookup[idx])
        title = asin2title.get(asin, "Unknown")
        results.append({"asin": asin, "title": title, "score": float(scores[idx])})
    return results
