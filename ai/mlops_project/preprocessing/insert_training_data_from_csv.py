import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text

# 1. CSV 읽기
csv_path = 'data/purchased_history.csv'
df = pd.read_csv(csv_path)

# 2. 날짜 컬럼 생성/수정 (purchase_date)
date_range = pd.date_range('2025-08-11', '2025-08-22')
df['purchase_date'] = np.random.choice(date_range, size=len(df))
df['purchase_date'] = df['purchase_date'].dt.date

# 3. DB 연결
engine = create_engine('postgresql://airflow:airflow123@mlops_mlflowdb:5432/airflowdb')

# 4. airflow_data 스키마/테이블 생성 (없으면)
schema_sql = text("""
CREATE SCHEMA IF NOT EXISTS airflow_data;
CREATE TABLE IF NOT EXISTS airflow_data.training_data (
    user_id VARCHAR(32),
    gender VARCHAR(10),
    age INTEGER,
    product_id INTEGER,
    product_name VARCHAR(255),
    category VARCHAR(100),
    price NUMERIC(10,2),
    purchase_date DATE,
    session_id VARCHAR(32)
);
""")

with engine.begin() as conn:
    conn.execute(schema_sql)
    conn.execute(text("DELETE FROM airflow_data.training_data;"))
    df.to_sql('training_data', conn, schema='airflow_data', if_exists='append', index=False)

print('적재 완료!')
