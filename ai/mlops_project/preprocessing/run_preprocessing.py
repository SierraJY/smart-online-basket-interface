import os
import psycopg2
import pandas as pd
from datetime import datetime, timedelta
import json

# Core DB 연결 설정 (읽기 전용)
CORE_DB_CONFIG = {
    "host": os.getenv("DB_HOST", "sobi-db"),
    "dbname": os.getenv("DB_NAME", "sobi"),
    "user": os.getenv("DB_USER", "mlops_reader"),
    "password": os.getenv("DB_PASSWORD", "mlops_read_only"),
    "port": int(os.getenv("DB_PORT", "5432")),
}

# Airflow DB 연결 설정 (쓰기 권한)
AIRFLOW_DB_CONFIG = {
    "host": os.getenv("DB_HOST", "sobi-db"),
    "dbname": "airflowdb",
    "user": "airflow",
    "password": "airflow123",
    "port": int(os.getenv("DB_PORT", "5432")),
}

def create_training_data_table(conn):
    """training_data 테이블 생성 (없는 경우)"""
    cursor = conn.cursor()
    
    # airflow_data 스키마에 training_data 테이블 생성
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS airflow_data.training_data (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        gender VARCHAR(10),
        age INTEGER,
        product_id INTEGER NOT NULL,
        product_name VARCHAR(255),
        category VARCHAR(100),
        price DECIMAL(10,2),
        purchase_date DATE,
        session_id TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    
    try:
        cursor.execute(create_table_sql)
        conn.commit()
        print("[INFO] training_data 테이블 생성 완료")
    except Exception as e:
        print(f"[WARN] 테이블 생성 중 오류: {e}")
        conn.rollback()
    finally:
        cursor.close()

def create_schema_if_not_exists(conn):
    """airflow_data 스키마 생성 (없는 경우)"""
    cursor = conn.cursor()
    
    create_schema_sql = "CREATE SCHEMA IF NOT EXISTS airflow_data;"
    
    try:
        cursor.execute(create_schema_sql)
        conn.commit()
        print("[INFO] airflow_data 스키마 생성 완료")
    except Exception as e:
        print(f"[WARN] 스키마 생성 중 오류: {e}")
        conn.rollback()
    finally:
        cursor.close()

def run_preprocessing():
    """데이터 전처리 실행 (이번 한 번만 purchased_sessions.csv 사용)"""
    # 일주일 전부터 오늘까지의 날짜 계산
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    print(f"[INFO] Target Date Range: {week_ago} ~ {today}")

    # 1단계: purchased_sessions.csv에서 데이터 읽기
    print("[INFO] purchased_sessions.csv에서 데이터 읽기 시작...")
    try:
        df_csv = pd.read_csv("data/purchased_sessions.csv")
        # 날짜 필터 적용
        df_csv["purchased_at"] = pd.to_datetime(df_csv["purchased_at"])
        df_csv = df_csv[(df_csv["purchased_at"].dt.date >= week_ago) & (df_csv["purchased_at"].dt.date <= today)]
        if df_csv.empty:
            print(f"[INFO] {week_ago} ~ {today} 날짜 범위에 데이터가 없습니다.")
            return
        print(f"[INFO] purchased_sessions.csv에서 {len(df_csv)}개 행 읽기 완료")
    except Exception as e:
        print(f"[ERROR] purchased_sessions.csv 읽기 실패: {e}")
        return

    # 2단계: sobi DB에서 customer, product 테이블 읽기
    print("[INFO] sobi DB에서 customer, product 테이블 읽기 시작...")
    try:
        core_conn = psycopg2.connect(**CORE_DB_CONFIG)
        customer_df = pd.read_sql("SELECT id AS user_id, gender, age FROM customer", core_conn)
        product_df = pd.read_sql("SELECT id AS product_id, name AS product_name, category, price FROM product", core_conn)
        core_conn.close()
        print(f"[INFO] customer: {len(customer_df)}개, product: {len(product_df)}개 행 읽기 완료")
    except Exception as e:
        print(f"[ERROR] sobi DB 읽기 실패: {e}")
        return

    # 3단계: product_list 파싱 및 데이터프레임 변환
    print("[INFO] product_list 파싱 및 데이터프레임 변환...")
    rows = []
    for _, row in df_csv.iterrows():
        user_id = row["user_id"]
        session_id = row["id"]
        purchased_at = row["purchased_at"]
        try:
            prod_dict = json.loads(row["product_list"].replace('""', '"'))
        except Exception as e:
            print(f"[WARN] product_list 파싱 실패: {row['product_list']}, 오류: {e}")
            continue
        for prod_id, qty in prod_dict.items():
            try:
                prod_id_int = int(prod_id)
                for _ in range(qty):
                    rows.append({
                        "user_id": user_id,
                        "session_id": purchased_at,
                        "product_id": prod_id_int,
                        "purchased_at": purchased_at
                    })
            except Exception as e:
                print(f"[WARN] product_id 변환 실패: {prod_id}, 오류: {e}")
                continue
    if not rows:
        print("[INFO] 파싱된 데이터가 없습니다.")
        return
    df = pd.DataFrame(rows)

    # 4단계: customer, product 정보 merge
    df = df.merge(customer_df, on="user_id", how="left")
    df = df.merge(product_df, on="product_id", how="left")

    # gender 값 변환 (0 → male, 1 → female)
    df["gender"] = df["gender"].map({0: "male", 1: "female"})
    df["purchase_date"] = pd.to_datetime(df["purchased_at"]).dt.date

    # amount(구매 총액) 계산: session_id(=purchased_at), user_id, purchase_date 기준 price 합산
    amount_df = df.groupby(["user_id", "session_id", "purchase_date"])['price'].sum().reset_index().rename(columns={"price": "amount"})
    df = df.merge(amount_df, on=["user_id", "session_id", "purchase_date"], how="left")

    # 필요한 컬럼 순서대로 맞추기
    df = df[[
        "user_id", "gender", "age", "product_id", "product_name",
        "category", "price", "purchase_date", "session_id", "amount"
    ]]
    print(f"[INFO] 데이터 전처리 완료: {len(df)}개 행")

    # 5단계: Airflow DB에 데이터 저장
    print("[INFO] Airflow DB에 데이터 저장 시작...")
    try:
        airflow_conn = psycopg2.connect(**AIRFLOW_DB_CONFIG)
        create_schema_if_not_exists(airflow_conn)
        create_training_data_table(airflow_conn)
        cursor = airflow_conn.cursor()
        delete_sql = f"DELETE FROM airflow_data.training_data WHERE purchase_date BETWEEN '{week_ago}' AND '{today}';"
        cursor.execute(delete_sql)
        print(f"[INFO] 기존 {week_ago} ~ {today} 데이터 삭제 완료")
        insert_sql = """
        INSERT INTO airflow_data.training_data 
        (user_id, gender, age, product_id, product_name, category, price, purchase_date, session_id, amount)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        inserted_count = 0
        for _, row in df.iterrows():
            try:
                cursor.execute(insert_sql, tuple(row))
                inserted_count += 1
            except Exception as e:
                print(f"[WARN] 행 삽입 실패: {row}, 오류: {e}")
                continue
        airflow_conn.commit()
        cursor.close()
        airflow_conn.close()
        print(f"[SUCCESS] {inserted_count}개 행을 airflow_data.training_data에 저장 완료")
    except Exception as e:
        print(f"[ERROR] Airflow DB 저장 실패: {e}")
        if 'airflow_conn' in locals():
            airflow_conn.close()

def test_connections():
    """DB 연결 테스트"""
    print("=== DB 연결 테스트 ===")
    
    # Core DB 연결 테스트
    try:
        core_conn = psycopg2.connect(**CORE_DB_CONFIG)
        cursor = core_conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        core_conn.close()
        print("✅ Core DB 연결 성공")
    except Exception as e:
        print(f"❌ Core DB 연결 실패: {e}")
    
    # Airflow DB 연결 테스트
    try:
        airflow_conn = psycopg2.connect(**AIRFLOW_DB_CONFIG)
        cursor = airflow_conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        airflow_conn.close()
        print("✅ Airflow DB 연결 성공")
    except Exception as e:
        print(f"❌ Airflow DB 연결 실패: {e}")

if __name__ == "__main__":
    # 연결 테스트
    test_connections()
    
    # 전처리 실행
    run_preprocessing()
