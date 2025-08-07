import pandas as pd
import os
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
from PIL import Image
import numpy as np
import lightgbm as lgb

plt.rcParams["font.family"] = "Malgun Gothic"


def create_features(df):
    df["week"] = df["ds"].dt.isocalendar().week
    df["year"] = df["ds"].dt.year
    df = df.sort_values("ds")
    df["lag_1"] = df["y"].shift(1)
    df["lag_2"] = df["y"].shift(2)
    df["lag_3"] = df["y"].shift(3)
    df = df.dropna()
    return df


def generate_restock_summary():
    df = pd.read_csv("./data/dummy2.csv")
    df["id"] = df["product_id"].astype(str)
    if "timestamp" in df.columns:
        df["ds"] = pd.to_datetime(df["timestamp"], unit="ms")
    elif "purchase_date" in df.columns:
        df["ds"] = pd.to_datetime(df["purchase_date"])
    else:
        raise Exception("날짜 컬럼 없음")
    df["ds"] = df["ds"] - pd.to_timedelta(df["ds"].dt.weekday, unit="d")
    df["ds"] = df["ds"].dt.to_period("W").dt.start_time

    # 상위 20개 중 6주 이상 데이터가 있는 상품만 top4 추출
    product_counts = df.groupby("id")["ds"].nunique()
    candidate_ids = product_counts[product_counts >= 6].index.tolist()
    topk_ids = [pid for pid in df["id"].value_counts().index if pid in candidate_ids][
        :4
    ]
    colors = ["#0072B2", "#D55E00", "#009E73", "#CC79A7"]

    os.makedirs("./output", exist_ok=True)
    summaries = []

    avg_sales_list = []
    pred_sales_list = []
    product_labels = []

    for idx, prod in enumerate(topk_ids):
        product_id = prod
        df_prod = df[df["id"] == prod].copy()
        df_week = df_prod.groupby("ds").size().reset_index(name="y")
        df_feat = create_features(df_week)

        print(
            f"\n[상품ID {product_id}] 전체 주간 데이터 개수: {len(df_week)}, 피처 데이터 개수: {len(df_feat)}"
        )
        if len(df_feat) < 2:
            print(
                f"[SKIP] 상품ID {product_id}: 데이터 부족 (len(df_feat)={len(df_feat)})"
            )
            continue

        last4 = df_week.tail(4)
        print(f"[상품ID {product_id}] 최근 4주 날짜: {last4['ds'].tolist()}")
        print(f"[상품ID {product_id}] 최근 4주 판매량: {last4['y'].tolist()}")

        train = df_feat.iloc[:-1]
        val = df_feat.iloc[-1:]
        X_train = train[["week", "year", "lag_1", "lag_2", "lag_3"]]
        y_train = train["y"]

        if X_train.shape[0] < 2 or X_train.shape[1] == 0:
            print(f"[SKIP] 상품ID {product_id}: 학습데이터 부족, 예측 스킵")
            pred = last4["y"].iloc[-1] if len(last4) > 0 else 0
        else:
            model = lgb.LGBMRegressor()
            model.fit(X_train, y_train)
            pred = model.predict(val[["week", "year", "lag_1", "lag_2", "lag_3"]])[0]

        pred_date = val["ds"].values[0]
        pred_y = pred

        avg_last4 = last4["y"].mean()

        avg_sales_list.append(avg_last4)
        pred_sales_list.append(pred_y)
        product_labels.append(product_id)

        change = pred_y - avg_last4
        if change > 0:
            summary = f"상품ID {product_id}: 다음 주 판매량이 {change:.1f} 증가 예측."
        else:
            summary = f"상품ID {product_id}: 다음 주 판매량이 {abs(change):.1f} 감소/정체 예상."
        summaries.append(summary)

    # 막대그래프 그리기
    bar_width = 0.35
    x = np.arange(len(product_labels))

    plt.figure(figsize=(10, 6))
    plt.bar(
        x - bar_width / 2,
        avg_sales_list,
        width=bar_width,
        color="#4c72b0",
        label="최근 4주 평균 판매량",
    )
    plt.bar(
        x + bar_width / 2,
        pred_sales_list,
        width=bar_width,
        color="#55a868",
        label="다음 주 예측 판매량",
    )

    plt.xticks(x, product_labels, fontsize=12)
    plt.ylabel("판매량", fontsize=14)
    plt.title(
        "상위 4개 상품 최근 4주 평균 vs 다음 주 예측 판매량",
        fontsize=16,
        fontweight="bold",
    )
    plt.legend(fontsize=12)
    plt.grid(axis="y", linestyle="--", alpha=0.5)

    # y축 정수 표시 및 범위 약간 여유있게 조절
    max_val = max(max(avg_sales_list), max(pred_sales_list))
    plt.ylim(0, max_val * 1.15)
    plt.gca().yaxis.set_major_locator(plt.MaxNLocator(integer=True))

    plt.tight_layout()

    png_path = "./output/lightgbm_bar_chart.png"
    plt.savefig(png_path, dpi=180)
    plt.close()

    jpg_path = png_path.replace(".png", ".jpg")
    Image.open(png_path).convert("RGB").save(jpg_path)
    abs_jpg_path = os.path.abspath(jpg_path)

    joined_summary = "\n".join(summaries)
    return joined_summary, abs_jpg_path


if __name__ == "__main__":
    summary, img_path = generate_restock_summary()
    print(summary)
    print(img_path)
