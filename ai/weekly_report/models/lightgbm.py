import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import lightgbm as lgb
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
    if execution_date is None:
        execution_date = datetime.now()
    end_date = execution_date.date() - timedelta(days=1)      
    start_date = end_date - timedelta(days=6)                 
    return start_date, end_date


def load_daily_series_until(end_date):
    query = """
        SELECT purchased_at::timestamp AS purchased_at
        FROM receipt
        WHERE DATE(purchased_at) <= %s
    """
    with get_db_connection() as conn:
        df = pd.read_sql(query, conn, params=(end_date,))
    if df.empty:
        raise ValueError("[ERROR] receipt 테이블에서 데이터가 조회되지 않았습니다.")

    df["ds"] = pd.to_datetime(df["purchased_at"]).dt.date
    daily = (
        df.groupby("ds").size().reset_index(name="y")
        .sort_values("ds")
        .reset_index(drop=True)
    )
    daily["ds"] = pd.to_datetime(daily["ds"])
    return daily  # columns: ds (datetime64[D]), y (int)


def make_features(df):
    """ df: columns [ds(datetime), y] """
    df = df.copy().sort_values("ds")
    df["dow"] = df["ds"].dt.weekday.astype(int)         
    df["week"] = df["ds"].dt.isocalendar().week.astype(int)
    df["year"] = df["ds"].dt.year.astype(int)
    for k in [1, 2, 3, 7]:
        df[f"lag_{k}"] = df["y"].shift(k)
    df = df.dropna().reset_index(drop=True)
    return df


def recursive_predict_next_7days(model, history_df):
    """
    history_df: columns [ds, y] (정렬), 마지막 날짜 다음날부터 7일 예측.
    lag 특성은 1,2,3,7 사용.
    """
    preds = []
    hist = history_df.copy().sort_values("ds").reset_index(drop=True)

    last_date = hist["ds"].iloc[-1]
    current_df = hist.copy()

    for i in range(1, 8):
        pred_date = last_date + timedelta(days=i)
        # 특성 생성용으로 최근 행들 활용
        tmp = current_df.copy()
        # 다음날 row를 미리 만들되 y는 NaN
        next_row = pd.DataFrame({"ds": [pred_date], "y": [np.nan]})
        tmp = pd.concat([tmp, next_row], ignore_index=True)

        # 피처 만들기
        feat = tmp.copy()
        feat["dow"] = feat["ds"].dt.weekday.astype(int)
        feat["week"] = feat["ds"].dt.isocalendar().week.astype(int)
        feat["year"] = feat["ds"].dt.year.astype(int)
        for k in [1, 2, 3, 7]:
            feat[f"lag_{k}"] = feat["y"].shift(k)

        # 예측 대상 행(마지막 행)의 피처 row
        row = feat.iloc[-1][["dow", "week", "year", "lag_1", "lag_2", "lag_3", "lag_7"]]

        # lag에 NaN 있으면 과거 데이터 부족 -> 0으로 보수적 대체
        row = row.fillna(0)

        yhat = float(model.predict(row.values.reshape(1, -1))[0])
        # 음수 방지
        yhat = max(0.0, yhat)
        preds.append({"ds": pred_date, "yhat": yhat})

        # 예측을 history에 반영하여 다음날 lag 생성에 활용
        current_df.loc[len(current_df) - 1, "y"] = current_df.loc[len(current_df) - 1, "y"]  # no-op for readability
        current_df = pd.concat(
            [current_df, pd.DataFrame({"ds": [pred_date], "y": [yhat]})],
            ignore_index=True,
        )

    return pd.DataFrame(preds)  # columns: ds, yhat


def _save_bar_chart(labels, avg_vals, pred_vals, out_png):
    plt.figure(figsize=(10, 6))
    x = np.arange(len(labels))
    bar_w = 0.35

    plt.bar(x - bar_w/2, avg_vals, width=bar_w, label="최근 7일 평균")
    plt.bar(x + bar_w/2, pred_vals, width=bar_w, label="다음 7일 예측 합계")

    plt.xticks(x, labels)
    plt.ylabel("거래 수(건)")
    plt.title("최근 7일 평균 vs 다음 7일 예측 합계")
    plt.legend()
    plt.grid(axis="y", linestyle="--", alpha=0.5)

    y_max = max(max(avg_vals or [0]), max(pred_vals or [0]))
    plt.ylim(0, max(1, y_max * 1.15))

    plt.tight_layout()
    plt.savefig(out_png, dpi=180)
    plt.close()


def generate_restock_summary(execution_date=None):
    # fp_growth 기준의 날짜 윈도우
    start_date, end_date = get_last_week_range(execution_date)
    print(f"[INFO] 기준 윈도우(최근 7일): {start_date} ~ {end_date}")

    # 예측 기준일(end_date)까지의 과거 전체 로드 후, 일 단위 시계열 생성
    daily = load_daily_series_until(end_date)
    print(f"[INFO] 전체 일 단위 데이터 개수: {len(daily)}")
    if len(daily) < 14:
        print("[WARN] 히스토리가 너무 짧습니다. 최소 2~3주 이상 권장.")

    # 피처 생성 및 학습/검증
    feat = make_features(daily)  # dropna 이후
    if feat.empty or feat.shape[0] < 7:
        # 데이터 부족 시 보수적 대체
        last_7 = daily[daily["ds"].between(pd.to_datetime(start_date), pd.to_datetime(end_date))]
        avg_last7 = float(last_7["y"].mean()) if not last_7.empty else 0.0
        pred_sum7 = avg_last7 * 7.0
        summary = f"데이터가 부족하여 보수적으로 다음 7일 합계를 최근 7일 평균×7({pred_sum7:.1f})로 가정합니다."
        # 시각화 저장
        os.makedirs("./output", exist_ok=True)
        png_path = "./output/lightgbm_bar_chart.png"
        _save_bar_chart(["ALL"], [avg_last7], [pred_sum7], png_path)
        jpg_path = os.path.abspath(png_path.replace(".png", ".jpg"))
        Image.open(png_path).convert("RGB").save(jpg_path)
        return summary, jpg_path

    # 학습 데이터/피처
    X = feat[["dow", "week", "year", "lag_1", "lag_2", "lag_3", "lag_7"]]
    y = feat["y"]
    model = lgb.LGBMRegressor()
    model.fit(X, y)

    # 다음 7일 예측 (end_date 다음날부터 7일)
    preds7 = recursive_predict_next_7days(model, daily[["ds", "y"]])
    pred_sum7 = float(preds7["yhat"].sum())

    # 최근 7일 평균 계산(리포트 기준 동일 윈도우)
    last_7 = daily[daily["ds"].between(pd.to_datetime(start_date), pd.to_datetime(end_date))]
    avg_last7 = float(last_7["y"].mean()) if not last_7.empty else 0.0

    delta = pred_sum7 - (avg_last7 * 7.0)
    if delta > 0:
        summary = f"다음 7일 총 거래량이 최근 7일 평균 대비 {delta:.1f}건 증가 예측."
    else:
        summary = f"다음 7일 총 거래량이 최근 7일 평균 대비 {abs(delta):.1f}건 감소/정체 예상."

    # 시각화 저장
    os.makedirs("./output", exist_ok=True)
    png_path = "./output/lightgbm_bar_chart.png"
    _save_bar_chart(["ALL"], [avg_last7], [pred_sum7], png_path)

    jpg_path = os.path.abspath(png_path.replace(".png", ".jpg"))
    Image.open(png_path).convert("RGB").save(jpg_path)

    return summary, jpg_path


if __name__ == "__main__":
    summary, img_path = generate_restock_summary()
    print(summary)
    print(img_path)
