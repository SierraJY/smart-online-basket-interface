import pandas as pd
import numpy as np
from sqlalchemy import create_engine

# 1. CSV 읽기
csv_path = 'S13P11B103/ai/mlops_project/data/purchased_history.csv'
df = pd.read_csv(csv_path)

# 2. 날짜 컬럼 생성/수정 (purchase_date)
date_range = pd.date_range('2025-08-11', '2025-08-22')
df['purchase_date'] = np.random.choice(date_range, size=len(df))
df['purchase_date'] = df['purchase_date'].dt.date

# 3. DB 연결
# airflowdb가 mlops_mlflowdb 컨테이너에서 5432 포트로 열려있다고 가정
# airflow:airflow123@mlops_mlflowdb:5432/airflowdb
engine = create_engine('postgresql://airflow:airflow123@mlops_mlflowdb:5432/airflowdb')

# 4. airflow_data.training_data에 적재 (기존 데이터 삭제 후)
with engine.begin() as conn:
    conn.execute("DELETE FROM airflow_data.training_data;")
    df.to_sql('training_data', conn, schema='airflow_data', if_exists='append', index=False)

print('적재 완료!')

