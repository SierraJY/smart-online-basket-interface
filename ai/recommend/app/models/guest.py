import joblib
import os
from collections import Counter, defaultdict

# 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "parameters", "guest_model")

# 모델/데이터 로드
vectorizer = joblib.load(os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl"))
knn = joblib.load(os.path.join(MODEL_DIR, "knn_model.pkl"))
df_items = joblib.load(os.path.join(MODEL_DIR, "df_items.pkl"))  # 'id', 'tag', 'name' 포함
tag_matrix = joblib.load(os.path.join(MODEL_DIR, "tag_matrix.pkl"))
co_purchase_dict = joblib.load(os.path.join(MODEL_DIR, "co_purchase_dict.pkl"))

# 제품 ID → 이름 매핑
id2title = dict(zip(df_items["id"], df_items["name"]))


def recommend(
    user_id,
    cart_items,  # 제품 ID 리스트
    co_top_k_per_item=10,
    co_candidate_limit=6,
    tfidf_per_item=5
):
    cart_set = set(cart_items)
    score_dict = defaultdict(float)

    # Step 1: 공동구매 후보 집계
    co_counter = Counter()
    for item in cart_items:
        co_items = co_purchase_dict.get(item, [])[:co_top_k_per_item]
        co_counter.update(co_items)
    for item in cart_items:
        co_counter.pop(item, None)

    co_purchased_candidates = [item for item, _ in co_counter.most_common(co_candidate_limit)]

    # Step 2: TF-IDF 유사도 계산
    for co_item in co_purchased_candidates:
        if co_item in df_items['id'].values:
            idx = df_items[df_items['id'] == co_item].index[0]
            vec = tag_matrix[idx]
            distances, indices = knn.kneighbors(vec, n_neighbors=tfidf_per_item + 1)

            for dist, i in zip(distances[0], indices[0]):
                sim_id = df_items.iloc[i]['id']
                if sim_id != co_item and sim_id not in cart_set:
                    sim_score = 1 - dist
                    score_dict[sim_id] += sim_score
        else:
            print(f"[!] '{co_item}'는 태그 기반 추천 대상에 없습니다.")

    # Step 3: 상위 추천 정렬 및 변환
    sorted_items = sorted(score_dict.items(), key=lambda x: x[1], reverse=True)
    recommendations = []
    for pid, _ in sorted_items[:30]:
        title = id2title.get(pid, "Unknown")
        recommendations.append({
            "asin": str(pid),   # string 통일 (회원용과 동일)
            "title": title
        })

    return {
        "user_id": user_id,
        "recommendations": recommendations
    }
