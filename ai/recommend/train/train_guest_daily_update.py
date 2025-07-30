import os
import pandas as pd
import joblib
import json
from collections import Counter, defaultdict
from datetime import datetime
from sqlalchemy import create_engine
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
from zoneinfo import ZoneInfo

# DB 연결 정보 (도커 기준)
DB_URL = "postgresql://user:password@db:5432/mydb"

# KST 기준 오늘 날짜 가져오기
def get_kst_today():
    now_kst = datetime.now(ZoneInfo("Asia/Seoul"))
    return now_kst.date().isoformat()

# 오늘 날짜 기준으로 구매내역 가져오기
def load_today_receipts(engine):
    today = get_kst_today()
    query = f"""
    SELECT id AS receipt_id, user_id, product_list, purchased_at
    FROM receipt
    WHERE purchased_at AT TIME ZONE 'Asia/Seoul'::text LIKE '{today}%'
    """
    return pd.read_sql(query, engine)

# product_list를 펼쳐서 row로 변환
def flatten_receipts(df):
    rows = []
    for _, row in df.iterrows():
        user_id = row['user_id']
        session_id = str(row['receipt_id'])
        try:
            product_dict = json.loads(row['product_list']) if isinstance(row['product_list'], str) else row['product_list']
        except Exception:
            continue

        for item_id_str, count_str in product_dict.items():
            try:
                item_id = int(item_id_str)
                count = int(count_str)
                for _ in range(count):
                    rows.append({
                        "user_id": user_id,
                        "session_id": session_id,
                        "id": item_id
                    })
            except:
                continue
    return pd.DataFrame(rows)

# 공동구매 사전 생성
def build_co_purchase_dict(purchase_df, product_col='id', session_col='session_id', top_n=10):
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

# 공동구매 사전 저장
def update_co_purchase_model(purchase_df, model_dir='./parameters/guest_model', top_n=10):
    os.makedirs(model_dir, exist_ok=True)
    path = os.path.join(model_dir, 'co_purchase_dict.pkl')

    if os.path.exists(path):
        co_dict = joblib.load(path)
    else:
        co_dict = {}

    new_dict = build_co_purchase_dict(purchase_df, top_n=top_n)
    for item, co_items in new_dict.items():
        if item not in co_dict:
            co_dict[item] = co_items
        else:
            merged = Counter(co_dict[item]) + Counter(co_items)
            co_dict[item] = [x for x, _ in merged.most_common(top_n)]

    joblib.dump(co_dict, path)
    print(f"[✓] 공동구매 사전 저장 완료 → {path}")

# TF-IDF + KNN 모델 재학습 (products 테이블에서 직접 불러옴)
def retrain_tfidf_knn_from_db(engine, save_dir='./parameters/guest_model', n_neighbors=5):
    query = "SELECT id, tag, name FROM products"
    df_items = pd.read_sql(query, engine).dropna(subset=['id', 'tag'])

    vectorizer = TfidfVectorizer()
    tag_matrix = vectorizer.fit_transform(df_items['tag'])

    knn = NearestNeighbors(n_neighbors=n_neighbors, metric='cosine')
    knn.fit(tag_matrix)

    os.makedirs(save_dir, exist_ok=True)
    joblib.dump(vectorizer, os.path.join(save_dir, 'tfidf_vectorizer.pkl'))
    joblib.dump(knn, os.path.join(save_dir, 'knn_model.pkl'))
    joblib.dump(df_items, os.path.join(save_dir, 'df_items.pkl'))
    joblib.dump(tag_matrix, os.path.join(save_dir, 'tag_matrix.pkl'))

    print(f"[✓] TF-IDF + KNN 모델 재학습 완료 → {save_dir}/")

# 전체 실행
if __name__ == "__main__":
    engine = create_engine(DB_URL)

    # 1. 오늘 구매내역 기반 공동구매 사전 업데이트
    df_receipt = load_today_receipts(engine)
    if df_receipt.empty:
        print("[!] 오늘 구매내역이 없습니다.")
    else:
        df_flat = flatten_receipts(df_receipt)
        update_co_purchase_model(df_flat, model_dir='./parameters/guest_model', top_n=10)

    # 2. 상품 태그 기반 TF-IDF + KNN 재학습
    retrain_tfidf_knn_from_db(engine, save_dir='./parameters/guest_model', n_neighbors=5)
