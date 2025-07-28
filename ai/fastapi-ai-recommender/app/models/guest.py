import joblib
import os

# 모델 로딩 (최초 1회만 로딩, 글로벌 변수로 유지)
BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, "guest_model")

vectorizer = joblib.load(os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl"))
knn = joblib.load(os.path.join(MODEL_DIR, "knn_model.pkl"))
df_items = joblib.load(os.path.join(MODEL_DIR, "df_items.pkl"))
tag_matrix = joblib.load(os.path.join(MODEL_DIR, "tag_matrix.pkl"))
co_purchase_dict = joblib.load(os.path.join(MODEL_DIR, "co_purchase_dict.pkl"))

def recommend(cart_items, top_k=6, tfidf_per_item=5):
    # 1. 공동구매 후보 수집
    co_purchase_candidates = set()
    for item in cart_items:
        co_purchase_candidates.update(co_purchase_dict.get(item, []))

    # 2. TF-IDF 기반 유사 상품 수집
    tfidf_recs = set()
    for item in co_purchase_candidates:
        if item in df_items['item_name'].values:
            idx = df_items[df_items['item_name'] == item].index[0]
            vector = tag_matrix[idx]
            distances, indices = knn.kneighbors(vector, n_neighbors=tfidf_per_item + 1)

            for i in indices.flatten():
                name = df_items.iloc[i]['item_name']
                if name != item:
                    tfidf_recs.add(name)

    # 3. 추천 리스트 구성 (장바구니에 없는 것만)
    all_recs = list(co_purchase_candidates.union(tfidf_recs) - set(cart_items))
    return [{"asin": name, "title": name} for name in all_recs[:top_k]]

