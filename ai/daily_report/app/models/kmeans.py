import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sqlalchemy import create_engine
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from collections import Counter
import os
from datetime import datetime, timedelta

plt.rcParams["font.family"] = "Malgun Gothic"

DB_URL = "postgresql://user:password@db:5432/mydb"


def get_last_7_days_range():
    today = datetime.today().date()
    end_date = today - timedelta(days=1)
    start_date = end_date - timedelta(days=6)
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


def load_and_preprocess():
    engine = create_engine(DB_URL)
    start_date, end_date = get_last_7_days_range()

    query = f"""
    SELECT r.id, r.user_id, r.product_list, r.purchased_at, u.gender, u.age
    FROM receipt r
    INNER JOIN "user" u ON r.user_id = u.id
    WHERE r.purchased_at BETWEEN '{start_date}' AND '{end_date}'
    """
    df = pd.read_sql(query, engine)

    # 가격 정보 로드
    product_df = pd.read_sql("SELECT id, price FROM product", engine)
    price_map = dict(zip(product_df["id"], product_df["price"]))

    def calc_amount(product_list):
        try:
            ids = eval(product_list)
            return sum(price_map.get(pid, 0) for pid in ids)
        except:
            return 0

    df["amount"] = df["product_list"].apply(calc_amount)

    # 유저별 집계
    agg = df.groupby("user_id").agg(
        total_amount=("amount", "sum"),
        purchase_count=("id", "count"),
        gender=("gender", "first"),
        age=("age", "first")
    ).reset_index()
    agg["avg_amount"] = agg["total_amount"] / agg["purchase_count"]
    agg["age_group"] = agg["age"].apply(get_age_group)

    return agg


def perform_clustering(df, n_clusters=5, save_dir="./output", filename="kmeans_clusters.png"):
    scaler = StandardScaler()
    X = scaler.fit_transform(df[["total_amount", "avg_amount", "purchase_count"]])

    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    df["cluster"] = kmeans.fit_predict(X)

    results = []
    for cluster_id, group in df.groupby("cluster"):
        mean_total = int(group["total_amount"].mean())
        mean_avg = int(group["avg_amount"].mean())
        mean_cnt = round(group["purchase_count"].mean(), 1)
        gender_ratio = group["gender"].value_counts(normalize=True).to_dict()
        age_ratio = group["age_group"].value_counts(normalize=True).to_dict()

        summary = (
            f" Cluster {cluster_id}:\n"
            f"  · 평균 총구매금액: {mean_total}원\n"
            f"  · 평균 1회당: {mean_avg}원\n"
            f"  · 평균 구매횟수: {mean_cnt}회\n"
            f"  · 성별 분포: {gender_ratio}\n"
            f"  · 연령대 분포: {age_ratio}"
        )
        results.append(summary)

    os.makedirs(save_dir, exist_ok=True)
    image_path = os.path.abspath(os.path.join(save_dir, filename))

    cluster_counts = df["cluster"].value_counts().sort_index()
    plt.figure(figsize=(8, 6))
    bars = plt.bar(cluster_counts.index.astype(str), cluster_counts.values, color="orange")
    plt.title("클러스터별 고객 수")
    plt.xlabel("Cluster ID")
    plt.ylabel("고객 수")
    for i, v in enumerate(cluster_counts.values):
        plt.text(i, v + 0.5, str(v), ha="center")
    plt.tight_layout()
    plt.savefig(image_path)
    plt.close()

    return "\n\n".join(results), image_path


def generate_spend_cluster_summary():
    df = load_and_preprocess()
    return perform_clustering(df, n_clusters=5)
