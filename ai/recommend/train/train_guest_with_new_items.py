import os
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors

def is_tag_data_updated(current_tag_csv='./data/products_all_tagged.csv', snapshot_path='./parameters/guest_model/last_tag_snapshot.pkl'):
    """
    태그 CSV 파일의 제품 ID 목록이 변경되었는지 확인
    """
    current_df = pd.read_csv(current_tag_csv)
    current_ids = set(current_df['id'])

    if not os.path.exists(snapshot_path):
        os.makedirs(os.path.dirname(snapshot_path), exist_ok=True)
        joblib.dump(current_ids, snapshot_path)
        return True

    previous_ids = joblib.load(snapshot_path)
    if current_ids != previous_ids:
        joblib.dump(current_ids, snapshot_path)
        return True

    return False

def retrain_tfidf_knn(tag_csv_path='./data/products_all_tagged.csv', save_dir='./parameters/guest_model', n_neighbors=5):
    """
    태그 CSV에 변경이 있는 경우에만 TF-IDF + KNN 모델 재학습
    """
    if not is_tag_data_updated(tag_csv_path, snapshot_path=os.path.join(save_dir, 'last_tag_snapshot.pkl')):
        print("[✓] 태그 파일 변경 없음 → TF-IDF 재학습 생략")
        return

    print("[INFO] 태그 변경 감지 → TF-IDF + KNN 재학습 시작")

    df_items = pd.read_csv(tag_csv_path)
    assert {'id', 'tag', 'name'}.issubset(df_items.columns), "[ERROR] 'id', 'tag', 'name' 컬럼이 필요합니다."
    df_items = df_items[['id', 'tag', 'name']].dropna()

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

if __name__ == "__main__":
    retrain_tfidf_knn(
        tag_csv_path='./data/products_all_tagged.csv',
        save_dir='./parameters/guest_model',
        n_neighbors=5
    )
