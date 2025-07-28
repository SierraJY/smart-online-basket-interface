import joblib
import os
from collections import Counter, defaultdict

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, "guest_model")

vectorizer = joblib.load(os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl"))
knn = joblib.load(os.path.join(MODEL_DIR, "knn_model.pkl"))
df_items = joblib.load(os.path.join(MODEL_DIR, "df_items.pkl"))
tag_matrix = joblib.load(os.path.join(MODEL_DIR, "tag_matrix.pkl"))
co_purchase_dict = joblib.load(os.path.join(MODEL_DIR, "co_purchase_dict.pkl"))

def recommend(cart_items, co_top_k_per_item=10, co_candidate_limit=30, tfidf_per_item=5):
    cart_set = set(cart_items)
    score_dict = defaultdict(float)

    # Step 1: 장바구니 기반 공동구매 후보 집계
    co_counter = Counter()
    for item in cart_items:
        co_items = co_purchase_dict.get(item, [])[:co_top_k_per_item]
        co_counter.update(co_items)
    for item in cart_items:
        co_counter.pop(item, None)

    co_purchased_candidates = [item for item, _ in co_counter.most_common(co_candidate_limit)]

    # Step 2: 공동구매 후보에 대해 TF-IDF 기반 유사 추천 + 점수 누적
    for co_item in co_purchased_candidates:
        if co_item in df_items['item_name'].values:
            idx = df_items[df_items['item_name'] == co_item].index[0]
            vec = tag_matrix[idx]
            distances, indices = knn.kneighbors(vec, n_neighbors=tfidf_per_item + 1)

            for dist, i in zip(distances[0], indices[0]):
                sim_item = df_items.iloc[i]['item_name']
                if sim_item != co_item and sim_item not in cart_set:
                    sim_score = 1 - dist
                    score_dict[sim_item] += sim_score
        else:
            print(f"[!] '{co_item}'는 태그 기반 추천 대상에 없습니다.")

    # Step 3: 점수 기준 정렬 후 상위 30개 선택
    sorted_items = sorted(score_dict.items(), key=lambda x: x[1], reverse=True)
    final = [{"asin": name, "title": name} for name, _ in sorted_items[:30]]
    return final
