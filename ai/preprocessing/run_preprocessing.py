import psycopg2
import pandas as pd
from datetime import datetime, timedelta

# DB 연결 설정
DB_CONFIG = {
    "host": "postgres",  # docker-compose의 서비스 이름
    "dbname": "sobi",
    "user": "sobiuser",
    "password": "sobipass",
    "port": 5432
}

def run_preprocessing():
    # 어제 날짜 계산 (Airflow 실행 시점 기준)
    target_date = (datetime.now() - timedelta(days=1)).date()  # YYYY-MM-DD
    print(f"[INFO] Target Date: {target_date}")

    # DB 연결
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # 1. 어제 날짜 데이터 receipt에서 가져오기
    query = f"""
        SELECT r.user_id, u.gender, u.age, p.id AS product_id, p.name AS product_name,
               p.category, p.price, r.purchased_at, r.session_id
        FROM receipt r
        JOIN "user" u ON r.user_id = u.id
        JOIN product p ON p.id = ANY (
            SELECT jsonb_array_elements_text(r.product_list)::int
        )
        WHERE DATE(r.purchased_at) = '{target_date}';
    """
    df = pd.read_sql(query, conn)

    if df.empty:
        print("[INFO] No data found for target date.")
        cursor.close()
        conn.close()
        return

    # gender 값 변환 (0 → male, 1 → female)
    df["gender"] = df["gender"].map({0: "male", 1: "female"})

    # 2. purchased_at → purchase_date 컬럼 변환 (YYYY-MM-DD 형식)
    df["purchase_date"] = pd.to_datetime(df["purchased_at"]).dt.date

    # 3. 필요한 컬럼 순서대로 맞추기
    df = df[[
        "user_id", "gender", "age", "product_id", "product_name",
        "category", "price", "purchase_date", "session_id"
    ]]

    # 4. training_data 테이블에 append
    for _, row in df.iterrows():
        cursor.execute("""
            INSERT INTO training_data (user_id, gender, age, product_id, product_name,
                                       category, price, purchase_date, session_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, tuple(row))

    conn.commit()
    cursor.close()
    conn.close()
    print(f"[INFO] Inserted {len(df)} rows into training_data.")

if __name__ == "__main__":
    run_preprocessing()
