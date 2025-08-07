import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
from PIL import Image

plt.rcParams["font.family"] = "Malgun Gothic"


def generate_forecast_summary():
    df = pd.read_csv("./data/dummy2.csv")
    df["id"] = df["product_id"].astype(str)
    if "timestamp" in df.columns:
        df["ds"] = pd.to_datetime(df["timestamp"], unit="ms")
    elif "purchase_date" in df.columns:
        df["ds"] = pd.to_datetime(df["purchase_date"])
    else:
        raise Exception("날짜 컬럼 없음")

    df["ds"] = df["ds"].dt.to_period("M").dt.to_timestamp()
    colors = [
        "#0072B2",
        "#D55E00",
        "#009E73",
        "#CC79A7",
        "#F0E442",
        "#56B4E9",
        "#E69F00",
        "#000000",
        "#999999",
        "#E6AB02",
    ]
    topk = 10
    topk_ids = df["id"].value_counts().head(topk).index.tolist()
    os.makedirs("./output", exist_ok=True)
    summaries = []
    plt.figure(figsize=(12, 6))

    for idx, prod in enumerate(topk_ids):
        product_id = prod
        df_prod = df[df["id"] == prod].copy()
        df_month = df_prod.groupby("ds").size().reset_index(name="y")

        # 실제 데이터 plot (★★ 항상 label 부여)
        plt.plot(
            df_month["ds"],
            df_month["y"],
            marker="o",
            color=colors[idx % len(colors)],
            linewidth=2,
            label=f"상품ID {product_id}",  # <- 바뀐 부분
        )

        # 예측: 과거 12개월 이동평균, 약간의 랜덤변동
        future_months = pd.date_range(
            start=df_month["ds"].max() + pd.offsets.MonthBegin(1), periods=24, freq="M"
        )
        # 실제 마지막 12개월의 평균
        moving_avg = df_month["y"].rolling(window=12, min_periods=1).mean().iloc[-1]
        forecast_y = []
        np.random.seed(42 + idx)
        for i in range(24):
            noise = np.random.normal(loc=0, scale=moving_avg * 0.07)  # 약 7% 노이즈
            val = moving_avg + noise
            # 전체 예측 평균의 ±15% 제한
            val = np.clip(val, moving_avg * 0.85, moving_avg * 1.15)
            forecast_y.append(val)

        # 연결선
        plt.plot(
            [df_month["ds"].values[-1], future_months[0]],
            [df_month["y"].values[-1], forecast_y[0]],
            linestyle="--",
            color=colors[idx % len(colors)],
            alpha=0.7,
        )
        # 예측선 (점선)
        plt.plot(
            future_months,
            forecast_y,
            linestyle="--",
            color=colors[idx % len(colors)],
            alpha=0.7,
        )

        change = forecast_y[-1] - df_month["y"].values[-1]
        if change > 0:
            summary = f"상품ID {product_id}: 2년 후 월 판매량이 {change:.1f} 증가 예측."
        else:
            summary = f"상품ID {product_id}: 2년 후 월 판매량이 {abs(change):.1f} 감소/정체 예상."
        summaries.append(summary)

    # 범례(중복 제거)
    handles, labels = plt.gca().get_legend_handles_labels()
    by_label = dict()
    for h, l in zip(handles, labels):
        if l not in by_label:
            by_label[l] = h
    plt.legend(
        by_label.values(), by_label.keys(), fontsize=11, loc="upper left", ncol=1
    )
    plt.title(
        "상위 상품 월별 판매량 및 2년 예측 (실제 기반 부드러운 예측선)",
        fontsize=16,
        fontweight="bold",
    )
    plt.xlabel("월", fontsize=14)
    plt.ylabel("판매량", fontsize=14)
    plt.grid(axis="y", alpha=0.2)
    plt.tight_layout()

    png_path = "./output/prophet_monthly_forecast_realistic_manual.png"
    plt.savefig(png_path, dpi=180)
    plt.close()
    jpg_path = png_path.replace(".png", ".jpg")
    Image.open(png_path).convert("RGB").save(jpg_path)
    abs_jpg_path = os.path.abspath(jpg_path)
    joined_summary = "\n".join(summaries)
    return joined_summary, abs_jpg_path


if __name__ == "__main__":
    summary, img_path = generate_forecast_summary()
    print(summary)
    print(img_path)
