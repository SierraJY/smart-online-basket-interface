import pandas as pd
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
import joblib
from collections import Counter, defaultdict


def build_co_purchase_dict(purchase_df, product_col='id', session_col='session_id', top_n=5):
    co_purchase = defaultdict(Counter)
    for session_id, group in purchase_df.groupby(session_col):
        items = group[product_col].tolist()
        for i in range(len(items)):
            for j in range(len(items)):
                if i != j:
                    co_purchase[items[i]][items[j]] += 1
    return {
        item: [x for x, _ in counter.most_common(top_n)]
        for item, counter in co_purchase.items()
    }


def train_full_initial_model(
    tag_csv_path,
    purchase_jsonl_path,
    save_dir='../parameters/guest_model',
    top_n=6,
    n_neighbors=5
):
    os.makedirs(save_dir, exist_ok=True)

    # 1. 상품 태그 정보 불러오기
    df_items = pd.read_csv(tag_csv_path)
    assert 'id' in df_items.columns and 'tag' in df_items.columns
    df_items = df_items[['id', 'tag']].dropna()

    # 2. TF-IDF 벡터 학습
    vectorizer = TfidfVectorizer()
    tag_matrix = vectorizer.fit_transform(df_items['tag'])  # '#단짠 #간식' 형식 → 공백 기준 분리

    # 3. KNN 학습
    knn = NearestNeighbors(n_neighbors=n_neighbors, metric='cosine')
    knn.fit(tag_matrix)

    # 4. 공동구매 사전 생성
    df_purchase = pd.read_json(purchase_jsonl_path, lines=True)
    assert 'session_id' in df_purchase.columns and 'id' in df_purchase.columns
    co_purchase_dict = build_co_purchase_dict(df_purchase, product_col='id', session_col='session_id', top_n=top_n)

    # 5. 모델 저장
    joblib.dump(vectorizer, os.path.join(save_dir, 'tfidf_vectorizer.pkl'))
    joblib.dump(knn, os.path.join(save_dir, 'knn_model.pkl'))
    joblib.dump(df_items, os.path.join(save_dir, 'df_items.pkl'))
    joblib.dump(tag_matrix, os.path.join(save_dir, 'tag_matrix.pkl'))
    joblib.dump(co_purchase_dict, os.path.join(save_dir, 'co_purchase_dict.pkl'))

    print(f"[✓] 초기 학습 및 저장 완료 → {save_dir}/")

if __name__ == "__main__":
    train_full_initial_model(
        tag_csv_path='../data/products_all_tagged.csv',
        purchase_jsonl_path='../data/session_data.jsonl'
    )
