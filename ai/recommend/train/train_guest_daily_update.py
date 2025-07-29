import os
import re
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
from collections import Counter, defaultdict
from datetime import datetime

# 최신 purchase CSV 찾기
def find_latest_purchase_csv(data_dir='./data', prefix='new_purchase_', suffix='.csv'):
    latest_file = None
    latest_date = None

    for fname in os.listdir(data_dir):
        if fname.startswith(prefix) and fname.endswith(suffix):
            match = re.search(rf'{prefix}(\d{{8}}){suffix}', fname)
            if match:
                date_str = match.group(1)
                try:
                    date = datetime.strptime(date_str, "%Y%m%d")
                    if latest_date is None or date > latest_date:
                        latest_date = date
                        latest_file = os.path.join(data_dir, fname)
                except ValueError:
                    continue

    return latest_file

# 공동구매 사전 생성 (제품 ID 기준)
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

# 공동구매 사전 업데이트
def update_co_purchase_model(daily_csv_path, existing_model_dir='./parameters/guest_model', top_n=5):
    co_purchase_path = os.path.join(existing_model_dir, 'co_purchase_dict.pkl')
    if os.path.exists(co_purchase_path):
        co_purchase_dict = joblib.load(co_purchase_path)
    else:
        co_purchase_dict = {}

    df_daily = pd.read_csv(daily_csv_path)
    assert 'session_id' in df_daily.columns and 'id' in df_daily.columns
    new_dict = build_co_purchase_dict(df_daily, product_col='id', session_col='session_id', top_n=top_n)

    for item, co_items in new_dict.items():
        if item not in co_purchase_dict:
            co_purchase_dict[item] = co_items
        else:
            merged = Counter(co_purchase_dict[item]) + Counter(co_items)
            co_purchase_dict[item] = [x for x, _ in merged.most_common(top_n)]

    joblib.dump(co_purchase_dict, co_purchase_path)
    print(f"[✓] 공동구매 사전 업데이트 완료 → {co_purchase_path}")

# TF-IDF + KNN 모델 재학습
def retrain_tfidf_knn(tag_csv_path, save_dir='./parameters/guest_model', n_neighbors=5):
    df_items = pd.read_csv(tag_csv_path)
    assert 'id' in df_items.columns and 'tag' in df_items.columns
    df_items = df_items[['id', 'tag', 'name']].dropna()

    vectorizer = TfidfVectorizer()
    tag_matrix = vectorizer.fit_transform(df_items['tag'])

    knn = NearestNeighbors(n_neighbors=n_neighbors, metric='cosine')
    knn.fit(tag_matrix)

    joblib.dump(vectorizer, os.path.join(save_dir, 'tfidf_vectorizer.pkl'))
    joblib.dump(knn, os.path.join(save_dir, 'knn_model.pkl'))
    joblib.dump(df_items, os.path.join(save_dir, 'df_items.pkl'))
    joblib.dump(tag_matrix, os.path.join(save_dir, 'tag_matrix.pkl'))
    print("[✓] TF-IDF + KNN 모델 재학습 완료")

# 통합 실행
if __name__ == "__main__":
    latest_csv = find_latest_purchase_csv(data_dir='./data')
    if latest_csv is None:
        print("[!] 최신 구매 CSV를 찾을 수 없습니다.")
        exit()

    update_co_purchase_model(latest_csv, existing_model_dir='./parameters/guest_model', top_n=5)
    retrain_tfidf_knn(tag_csv_path='./data/products_all_tagged.csv', save_dir='./parameters/guest_model', n_neighbors=5)
