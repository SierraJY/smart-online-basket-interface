import pandas as pd
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
import joblib
from collections import Counter, defaultdict

# 공동구매 사전 생성 함수
def build_co_purchase_dict(purchase_df, top_n=5):
    """
    세션 기반 구매 데이터로부터 공동구매 상위 N개 추출

    Returns:
        dict: {'치토스': ['홈런볼', '질럿육포'], ...}
    """
    co_purchase = defaultdict(Counter)

    for session_id, group in purchase_df.groupby("session_id"):
        items = group["product_name"].tolist()
        for i in range(len(items)):
            for j in range(len(items)):
                if i != j:
                    co_purchase[items[i]][items[j]] += 1

    # top_n 개씩만 남기기
    co_purchase_dict = {
        item: [x for x, _ in counter.most_common(top_n)]
        for item, counter in co_purchase.items()
    }
    return co_purchase_dict

# 전체 모델 학습 + 저장
def train_full_initial_model(tag_csv_path, purchase_csv_path, save_dir='./models', top_n=5, n_neighbors=5):
    """
    태그 기반 TF-IDF + KNN 모델 학습 + 공동구매 사전 생성 후 저장

    Parameters:
        tag_csv_path (str): 'item_name', 'tags' 포함된 CSV 경로
        purchase_csv_path (str): 'session_id', 'product_name' 포함된 CSV 경로
        save_dir (str): 저장 폴더
        top_n (int): 공동구매 상위 N개
        n_neighbors (int): 콘텐츠 기반 유사도 추론 K개
    """
    os.makedirs(save_dir, exist_ok=True)

    # 1. 상품 태그 정보 불러오기
    df_items = pd.read_csv(tag_csv_path)
    assert 'item_name' in df_items.columns and 'tags' in df_items.columns

    # 2. TF-IDF 벡터 학습
    vectorizer = TfidfVectorizer()
    tag_matrix = vectorizer.fit_transform(df_items['tags'])

    # 3. KNN 학습
    knn = NearestNeighbors(n_neighbors=n_neighbors, metric='cosine')
    knn.fit(tag_matrix)

    # 4. 공동구매 사전 생성
    df_purchase = pd.read_csv(purchase_csv_path)
    assert 'session_id' in df_purchase.columns and 'product_name' in df_purchase.columns
    co_purchase_dict = build_co_purchase_dict(df_purchase, top_n=top_n)

    # 5. 모델 저장
    joblib.dump(vectorizer, os.path.join(save_dir, 'tfidf_vectorizer.pkl'))
    joblib.dump(knn, os.path.join(save_dir, 'knn_model.pkl'))
    joblib.dump(df_items, os.path.join(save_dir, 'df_items.pkl'))
    joblib.dump(tag_matrix, os.path.join(save_dir, 'tag_matrix.pkl'))
    joblib.dump(co_purchase_dict, os.path.join(save_dir, 'co_purchase_dict.pkl'))

    print(f"[INFO] 초기 학습 및 저장 완료 → {save_dir}/")

if __name__ == "__main__":
    train_full_initial_model(
        tag_csv_path='./data/initial_tag_data.csv',
        purchase_csv_path='./data/purchase_history.csv'
    )
