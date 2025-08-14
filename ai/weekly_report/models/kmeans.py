import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

plt.rcParams["font.family"] = "Malgun Gothic"


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'sobi-db'),
        database=os.getenv('DB_NAME', 'sobi'),
        user=os.getenv('DB_USER', 'airflow'),
        password=os.getenv('DB_PASSWORD', 'airflow'),
        port=int(os.getenv('DB_PORT', '5432')),
        cursor_factory=RealDictCursor,
    )


def get_last_week_range(execution_date=None):
    """fp_growth.py와 동일: (어제 ~ 6일 전) 최근 7일, 오늘 제외"""
    if execution_date is None:
        execution_date = datetime.now()
    end_date = execution_date.date() - timedelta(days=1)   # 어제
    start_date = end_date - timedelta(days=6)              # 6일 전
    return start_date, end_date


def get_age_group(age):
    if age < 20:
        return "10대"
    elif age < 30:
        return "20대"
    elif age < 40:
        return "30대"
    elif age < 50:
        return "40대"
    elif age < 60:
        return "50대"
    else:
        return "60대 이상"


def load_and_preprocess(execution_date=None):
    start_date, end_date = get_last_week_range(execution_date)

    try:
        with get_db_connection() as conn:
            query = """
            SELECT 
                td.user_id,
                td.session_id,
                td.purchased_at,
                td.price AS amount,
                COALESCE(td.gender, 'unknown') AS gender,
                COALESCE(td.age, 0) AS age
            FROM training_data td
            WHERE DATE(td.purchased_at) BETWEEN %s AND %s
            """
            df = pd.read_sql(query, conn, params=(start_date, end_date))

        print(f"[데이터 조회 기간] {start_date} ~ {end_date}")
        print(f"[조회된 데이터 건수] {len(df)}건")

        if df.empty:
            raise ValueError(f"해당 기간({start_date} ~ {end_date})에 데이터가 없습니다.")

        # 유저 기준 집계 (세션 단위 구매횟수: nunique)
        agg = (
            df.groupby("user_id", as_index=False)
              .agg(
                  total_amount=("amount", "sum"),
                  purchase_count=("session_id", "nunique"),
                  gender=("gender", "first"),
                  age=("age", "first"),
              )
        )
        # 방어코드: 0으로 나눔 방지
        agg["purchase_count"] = agg["purchase_count"].replace(0, np.nan)
        agg["avg_amount"] = agg["total_amount"] / agg["purchase_count"]
        agg["purchase_count"] = agg["purchase_count"].fillna(0).astype(int)
        agg["avg_amount"] = agg["avg_amount"].fillna(0)

        agg["age_group"] = agg["age"].apply(get_age_group)

        # 모델 입력에 모두 0인 행 제거(학습 안정성)
        feat_cols = ["total_amount", "avg_amount", "purchase_count"]
        all_zero = (agg[feat_cols].sum(axis=1) == 0)
        if all_zero.any():
            print(f"[정리] 모든 금액/횟수가 0인 {all_zero.sum()}명 제거")
            agg = agg.loc[~all_zero].reset_index(drop=True)

        print(f"[전처리 완료] 분석 대상 고객 수: {len(agg)}명")
        return agg

    except Exception as e:
        print(f"[ERROR] 데이터 로드/전처리 실패: {str(e)}")
        raise


def perform_clustering(
    df, n_clusters=5, save_dir="./output", filename="kmeans_clusters.png"
):
    if df.empty:
        raise ValueError("클러스터링 입력 데이터프레임이 비어 있습니다.")

    X_raw = df[["total_amount", "avg_amount", "purchase_count"]].astype(float)
    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    # sklearn 1.4+ 경고 억제용 n_init='auto'
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    df = df.copy()
    df["cluster"] = kmeans.fit_predict(X)

    # 클러스터 요약
    results = []
    for cluster_id, group in df.groupby("cluster"):
        mean_total = int(group["total_amount"].mean())
        mean_avg = int(group["avg_amount"].mean())
        mean_cnt = round(group["purchase_count"].mean(), 1)
        gender_ratio = group["gender"].value_counts(normalize=True).round(3).to_dict()
        age_ratio = group["age_group"].value_counts(normalize=True).round(3).to_dict()

        summary = (
            f"Cluster {cluster_id}:\n"
            f"  · 평균 총구매금액: {mean_total:,}원\n"
            f"  · 평균 1회당: {mean_avg:,}원\n"
            f"  · 평균 구매횟수: {mean_cnt}회\n"
            f"  · 성별 분포: {gender_ratio}\n"
            f"  · 연령대 분포: {age_ratio}"
        )
        results.append(summary)

    # 시각화
    os.makedirs(save_dir, exist_ok=True)
    image_path = os.path.abspath(os.path.join(save_dir, filename))

    cluster_counts = df["cluster"].value_counts().sort_index()
    plt.figure(figsize=(8, 6))
    bars = plt.bar(cluster_counts.index.astype(str), cluster_counts.values)
    plt.title("클러스터별 고객 수")
    plt.xlabel("Cluster ID")
    plt.ylabel("고객 수")
    for i, v in enumerate(cluster_counts.values):
        plt.text(i, v + 0.5, f"{v:,}명", ha="center")
    plt.tight_layout()
    plt.savefig(image_path, dpi=160)
    plt.close()

    return "\n\n".join(results), image_path


def generate_customer_cluster_summary(execution_date=None):
    try:
        df = load_and_preprocess(execution_date)
        return perform_clustering(df, n_clusters=5)
    except Exception as e:
        print(f"[ERROR] 고객 군집 분석 실패: {str(e)}")
        raise


if __name__ == "__main__":
    text, img = generate_customer_cluster_summary()
    print(text)
    print(img)
