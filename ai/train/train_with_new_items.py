import os
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors

def is_tag_data_updated(current_tag_csv='./data/initial_tag_data.csv', snapshot_path='./models/last_tag_snapshot.pkl'):
    """
    태그 CSV 파일의 item_name 목록이 변경되었는지 확인
    """
    current_df = pd.read_csv(current_tag_csv)
    current_items = set(current_df['item_name'])

    if not os.path.exists(snapshot_path):
        joblib.dump(current_items, snapshot_path)
        return True

    previous_items = joblib.load(snapshot_path)
    if current_items != previous_items:
        joblib.dump(current_items, snapshot_path)
        return True

    return False

def retrain_tfidf_knn(tag_csv_path='./data/initial_tag_data.csv', save_dir='./models', n_neighbors=5):
    """
    태그 CSV에 변경이 있는 경우에만 TF-IDF + KNN 모델 재학습
    """
    if not is_tag_data_updated(tag_csv_path):
        print("[✓] 태그 파일 변경 없음 → TF-IDF 재학습 생략")
        return

    print("[INFO] 태그 변경 감지 → TF-IDF + KNN 재학습 시작")

    df_items = pd.read_csv(tag_csv_path)
    vectorizer = TfidfVectorizer()
    tag_matrix = vectorizer.fit_transform(df_items['tags'])

    knn = NearestNeighbors(n_neighbors=n_neighbors, metric='cosine')
    knn.fit(tag_matrix)

    os.makedirs(save_dir, exist_ok=True)
    joblib.dump(vectorizer, os.path.join(save_dir, 'tfidf_vectorizer.pkl'))
    joblib.dump(knn, os.path.join(save_dir, 'knn_model.pkl'))
    joblib.dump(df_items, os.path.join(save_dir, 'df_items.pkl'))
    joblib.dump(tag_matrix, os.path.join(save_dir, 'tag_matrix.pkl'))

    print("[✓] TF-IDF + KNN 모델 재학습 완료 → 모델 저장됨")

if __name__ == "__main__":
    retrain_tfidf_knn(
        tag_csv_path='./data/initial_tag_data.csv',
        save_dir='./models',
        n_neighbors=5
    )
