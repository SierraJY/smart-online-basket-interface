import pandas as pd
import json
from prophet import Prophet
import matplotlib.pyplot as plt
import os
from PIL import Image

plt.rcParams["font.family"] = "Malgun Gothic"  # 윈도우


def generate_forecast_summary():
    # (1) 데이터 로드
    records = []
    with open("./data/user_id_id_name_sim08.jsonl", encoding="utf-8") as f:
        for line in f:
            records.append(json.loads(line))
    df = pd.DataFrame(records)

    # (2) 타입 맞추기 및 주 시작일
    df["id"] = df["id"].astype(str)
    df["ds"] = pd.to_datetime(df["timestamp"], unit="ms")
    df["ds"] = df["ds"] - pd.to_timedelta(df["ds"].dt.weekday, unit="d")  # 월요일 기준

    # (3) 상위 10개 상품 추출
    topk = 10
    topk_ids = df["id"].value_counts().head(topk).index.tolist()

    os.makedirs("./output", exist_ok=True)
    summaries = []

    plt.figure(figsize=(16, 8))
    for idx, prod in enumerate(topk_ids):
        df_prod = df[df["id"] == prod].copy()
        df_week = df_prod.groupby("ds").size().reset_index(name="y")
        exclude_weeks = 26
        df_train = (
            df_week.iloc[:-exclude_weeks]
            if len(df_week) > exclude_weeks
            else df_week.copy()
        )
        predict_weeks = 9
        m = Prophet(
            weekly_seasonality=True, daily_seasonality=False, yearly_seasonality=False
        )
        m.fit(df_train)
        future = m.make_future_dataframe(periods=predict_weeks, freq="W-MON")
        forecast = m.predict(future)

        plt.plot(
            df_week["ds"],
            df_week["y"],
            "o-",
            alpha=0.5,
            label=f"{prod} 실제" if idx == 0 else "",
        )
        plt.plot(forecast["ds"], forecast["yhat"], "--", label=f"{prod} 예측")

        pred_start = forecast.iloc[-predict_weeks]["yhat"]
        pred_end = forecast.iloc[-1]["yhat"]
        change = pred_end - pred_start
        if change > 0:
            summary = f"상품 {prod}: 향후 2개월간 주별 판매량이 {change:.1f} 증가할 것으로 예측."
        else:
            summary = f"상품 {prod}: 향후 2개월간 주별 판매량이 {abs(change):.1f} 감소/정체 예상."
        summaries.append(summary)

    plt.title("상위 10개 상품 주별 판매량 예측 (실제/예측)", fontsize=15)
    plt.xlabel("주(날짜)", fontsize=12)
    plt.ylabel("판매량", fontsize=12)
    plt.legend(fontsize=10, ncol=2)
    plt.tight_layout()
    png_path = "./output/prophet_forecast_allinone.png"
    plt.savefig(png_path)
    plt.close()

    # PNG → JPG 변환
    jpg_path = png_path.replace(".png", ".jpg")
    im = Image.open(png_path)
    rgb_im = im.convert("RGB")
    rgb_im.save(jpg_path)

    abs_jpg_path = os.path.abspath(jpg_path)
    joined_summary = "\n".join(summaries)
    return joined_summary, abs_jpg_path  # **절대경로로 반환**
