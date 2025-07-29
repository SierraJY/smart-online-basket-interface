import numpy as np
import onnxruntime as ort
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "parameters", "member_model")

user_lookup = np.load(os.path.join(MODEL_DIR, "user_lookup.npy"))
context_lookup = np.load(os.path.join(MODEL_DIR, "context_lookup.npy"))
item_embs = np.load(os.path.join(MODEL_DIR, "item_embeddings.npy"))
with open(os.path.join(MODEL_DIR, "id2title.json"), encoding="utf-8") as f:
    id2title = json.load(f)

session = ort.InferenceSession(os.path.join(MODEL_DIR, "model_quantized.onnx"))


def to_idx(val, vocab):
    idx = np.where(vocab == val)[0]
    return int(idx[0]) if len(idx) > 0 else 0


def recommend(
    user_id, gender, age, cart=None, wish_list=None, topk=5, context_weight=5.0
):
    MAX_CONTEXT_LEN = 5
    cart = cart if cart else []
    wish_list = wish_list if wish_list else []
    context = list(dict.fromkeys(cart + wish_list))
    context = (context + [""] * MAX_CONTEXT_LEN)[:MAX_CONTEXT_LEN]

    user_idx = np.array([to_idx(user_id, user_lookup)], dtype=np.int32)
    context_idx = np.array(
        [[to_idx(x, context_lookup) for x in context]], dtype=np.int32
    )
    gender_idx = np.array([int(gender)], dtype=np.int32)
    age_idx = np.array([int(age)], dtype=np.int32)

    inputs = {
        "args_0": user_idx,
        "args_0_1": context_idx,
        "args_0_2": gender_idx,
        "args_0_3": age_idx,
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

    recommendations = []
    for pid in final_ids:
        title = id2title.get(pid, "Unknown")
        recommendations.append({"asin": pid, "title": title})

    return {
        "user_id": user_id,
        "recommendations": recommendations
    }
