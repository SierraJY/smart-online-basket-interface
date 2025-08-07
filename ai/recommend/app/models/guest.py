import joblib
import os
from collections import Counter, defaultdict

# 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "parameters", "guest_model")

# 모델/데이터 로드
vectorizer = joblib.load(os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl"))
knn = joblib.load(os.path.join(MODEL_DIR, "knn_model.pkl"))
df_items = joblib.load(os.path.join(MODEL_DIR, "df_items.pkl"))
tag_matrix = joblib.load(os.path.join(MODEL_DIR, "tag_matrix.pkl"))
co_purchase_dict = joblib.load(os.path.join(MODEL_DIR, "co_purchase_dict.pkl"))


def recommend(
    user_id,
    cart_items,  # 제품 ID 리스트
    co_top_k_per_item=10,
    co_candidate_limit=6,
    tfidf_per_item=5
):
    cart_items = [int(x) for x in cart_items]
    print(f"\n[DEBUG] user_id={user_id}, cart_items={cart_items}")

    cart_set = set(cart_items)
    score_dict = defaultdict(float)

    # Step 1: 공동구매 후보 집계
    co_counter = Counter()
    for item in cart_items:
        co_items = co_purchase_dict.get(item, [])[:co_top_k_per_item]
        print(f"  [DEBUG] co_items for {item}: {co_items}")
        co_counter.update(co_items)
    for item in cart_items:
        co_counter.pop(item, None)
    print(f"  [DEBUG] co_counter: {co_counter}")

    co_purchased_candidates = [item for item, _ in co_counter.most_common(co_candidate_limit)]
    print(f"  [DEBUG] co_purchased_candidates: {co_purchased_candidates}")

    # Step 2: 공동구매 후보가 있다면 → TF-IDF 유사도 계산
    if co_purchased_candidates:
        print("[INFO] 공동구매 기반 추천 수행 중...")
        for co_item in co_purchased_candidates:
            if co_item in df_items['id'].values:
                idx = df_items[df_items['id'] == co_item].index[0]
                vec = tag_matrix[idx]
                distances, indices = knn.kneighbors(vec, n_neighbors=tfidf_per_item + 1)
                print(f"    [DEBUG] TF-IDF knn for {co_item}: indices={indices}, distances={distances}")

                for dist, i in zip(distances[0], indices[0]):
                    sim_id = df_items.iloc[i]['id']
                    if sim_id != co_item and sim_id not in cart_set:
                        sim_score = 1 - dist
                        score_dict[sim_id] += sim_score
            else:
                print(f"[!] '{co_item}'는 태그 기반 추천 대상에 없습니다.")

    # Step 3: 공동구매 후보가 부족하면 → Fallback: 장바구니 아이템 자체 기반 TF-IDF 추천
    if not score_dict:
        print("[INFO] 공동구매 추천 불가. TF-IDF Fallback 추천 수행 중...")
        for item in cart_items:
            if item in df_items['id'].values:
                idx = df_items[df_items['id'] == item].index[0]
                vec = tag_matrix[idx]
                distances, indices = knn.kneighbors(vec, n_neighbors=tfidf_per_item + 1)
                print(f"    [DEBUG] TF-IDF fallback knn for {item}: indices={indices}, distances={distances}")

                for dist, i in zip(distances[0], indices[0]):
                    sim_id = df_items.iloc[i]['id']
                    if sim_id != item and sim_id not in cart_set:
                        sim_score = 1 - dist
                        score_dict[sim_id] += sim_score
            else:
                print(f"[!] '{item}'는 태그 기반 추천 대상에 없습니다.")

    # Step 4: 정렬 및 추천 결과 생성
    print(f"  [DEBUG] score_dict: {dict(score_dict)}")
    sorted_items = sorted(score_dict.items(), key=lambda x: x[1], reverse=True)
    recommended_ids = [str(pid) for pid, _ in sorted_items[:30]]

    print(f"[DEBUG] 최종 추천 상품: {recommended_ids}")

    return {
        "user_id": user_id,
        "recommendations": recommended_ids
    }
