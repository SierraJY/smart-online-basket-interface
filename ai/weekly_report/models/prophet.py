import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import psycopg2
from datetime import datetime, timedelta

plt.rcParams["font.family"] = "Malgun Gothic"


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "sobi-db"),
        database=os.getenv("DB_NAME", "sobi"),
        user=os.getenv("DB_USER", "airflow"),
        password=os.getenv("DB_PASSWORD", "airflow"),
        port=int(os.getenv("DB_PORT", "5432")),
    )


def get_last_week_range(execution_date=None):
    """fp_growth와 동일: (어제 ~ 6일 전) 최근 7일, 오늘 제외"""
    if execution_date is None:
        execution_date = datetime.now()
    end_date = execution_date.date() - timedelta(days=1)   
    start_date = end_date - timedelta(days=6)              
    return start_date, end_date


def load_daily_counts_until(end_date):
    """
    receipt 테이블에서 end_date(어제)까지의 일별 건수(y)를 로드.
    반환: columns = [ds(datetime), y(int)]
    """
    query = """
        SELECT DATE(purchased_at) AS ds, COUNT(*) AS y
        FROM receipt
        WHERE DATE(purchased_at) <= %s
        GROUP BY 1
        ORDER BY 1
    """
    with get_db_connection() as conn:
        df = pd.read_sql(query, conn, params=(end_date,))
    if df.empty:
        raise ValueError("[ERROR] receipt 테이블에서 데이터가 조회되지 않았습니다.")
    df["ds"] = pd.to_datetime(df["ds"])
    return df


def generate_forecast_summary(execution_date=None):
    start_date, end_date = get_last_week_range(execution_date)
    print(f"[INFO] 기준 윈도우(최근 7일): {start_date} ~ {end_date}")

    # 1) 일단위 전체 히스토리(어제까지) 로드
    df_daily = load_daily_counts_until(end_date)
    print(f"[INFO] 일별 데이터 개수: {len(df_daily)}")

    # 2) 월 단위 집계 (월 시작일로 정규화)
    df_month = (
        df_daily.assign(ds=lambda d: d["ds"].dt.to_period("M").dt.to_timestamp())
               .groupby("ds", as_index=False)
               .agg(y=("y", "sum"))
               .sort_values("ds")
               .reset_index(drop=True)
    )
    if df_month.empty:
        raise ValueError("[ERROR] 월 집계 결과가 비어있습니다.")

    # 3) 최근 7일 평균 (리포트 비교 기준 통일)
    last7_mask = (df_daily["ds"].dt.date >= start_date) & (df_daily["ds"].dt.date <= end_date)
    last7 = df_daily.loc[last7_mask]
    avg_last7 = float(last7["y"].mean()) if not last7.empty else 0.0

    # 4) 단순 예측: 마지막 12개월 이동평균을 기반으로 24개월 전망 + ±15% 클리핑
    moving_avg = df_month["y"].rolling(window=12, min_periods=1).mean().iloc[-1]
    np.random.seed(42)
    forecast_y = []
    for i in range(24):
        noise = np.random.normal(loc=0, scale=moving_avg * 0.07)  # ~7% 변동
        val = moving_avg + noise
        val = np.clip(val, moving_avg * 0.85, moving_avg * 1.15)  # ±15%
        forecast_y.append(float(val))

    # 예측 월(월 시작, 'MS')
    future_months = pd.date_range(
        start=df_month["ds"].max() + pd.offsets.MonthBegin(1),
        periods=24,
        freq="MS",
    )

    # 5) 요약문: “다음 7일 총량(월 예측을 일평균으로 환산하는 대신 보수적으로 ‘최근7일 평균×7’과 비교)”
    # 월 예측을 7일로 직접 환산하기보단, 간단 요약은 월 단위 변화 + 최근7일 비교를 같이 제공
    month_change = forecast_y[-1] - df_month["y"].iloc[-1]
    if month_change > 0:
        month_summary = f"월 추세: 2년 후 월 거래량이 최근 실측 월 대비 {month_change:.1f} 증가 예측."
    else:
        month_summary = f"월 추세: 2년 후 월 거래량이 최근 실측 월 대비 {abs(month_change):.1f} 감소/정체 예상."

    # 리포트 기준 통일(최근 7일)
    next7_proxy = avg_last7 * 7.0  # 모델 예측과 직접 매핑하지 않고, 보수적 지표로 제시
    week_summary = f"최근 7일 평균은 {avg_last7:.1f}건/일(합계 {avg_last7*7:.1f}건)."

    summaries = [f"상품ID ALL: {month_summary}", week_summary]

    # 6) 시각화: 실측 월별 + 예측 월별
    os.makedirs("./output", exist_ok=True)
    plt.figure(figsize=(12, 6))

    # 실제선
    plt.plot(
        df_month["ds"], df_month["y"],
        marker="o", linewidth=2, label="실제(월별 합계)",
    )
    # 연결선
    plt.plot(
        [df_month["ds"].values[-1], future_months[0]],
        [df_month["y"].values[-1], forecast_y[0]],
        linestyle="--", alpha=0.7,
    )
    # 예측선
    plt.plot(
        future_months, forecast_y,
        linestyle="--", alpha=0.7, label="예측(향후 24개월)",
    )

    plt.title("전체 월별 거래량 및 2년 예측", fontsize=16, fontweight="bold")
    plt.xlabel("월", fontsize=13)
    plt.ylabel("거래량(월 합계)", fontsize=13)
    plt.legend(loc="upper left")
    plt.grid(axis="y", alpha=0.25)
    plt.tight_layout()

    png_path = "./output/prophet_monthly_forecast_realistic_manual.png"
    plt.savefig(png_path, dpi=180)
    plt.close()

    jpg_path = png_path.replace(".png", ".jpg")
    Image.open(png_path).convert("RGB").save(jpg_path)
    abs_jpg_path = os.path.abspath(jpg_path)

    return "\n".join(summaries), abs_jpg_path


if __name__ == "__main__":
    summary, img_path = generate_forecast_summary()
    print(summary)
    print(img_path)
