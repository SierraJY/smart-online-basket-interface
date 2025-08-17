import os
import json
from collections import Counter, defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
import time
import shutil
import subprocess
import traceback

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import create_engine
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
import mlflow
import mlflow.sklearn

# MLflow 설정
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

# ===============================
# 0) 경로/환경 + SSH 유틸 (영구 해결)
# ===============================
BASE_DIR = Path(__file__).resolve().parent  # /app

# 🎯 체계적인 모델 저장 구조 (환경변수로 받아서 유연하게 설정)
GUEST_MODELS_DIR = Path(os.getenv("OUTPUT_DIR", "/opt/airflow/models/guest/latest")).parent.parent
GUEST_LATEST_DIR = Path(os.getenv("OUTPUT_DIR", "/opt/airflow/models/guest/latest"))
GUEST_ARCHIVE_DIR = GUEST_MODELS_DIR / "archive"
GUEST_SERVING_DIR = GUEST_MODELS_DIR / "serving"

# 디렉토리 생성
for dir_path in [GUEST_LATEST_DIR, GUEST_ARCHIVE_DIR, GUEST_SERVING_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# 현재 학습용 디렉토리 (latest 사용)
GUEST_EXPORT_DIR = GUEST_LATEST_DIR

# DB 연결 설정 (Airflow DB 사용)
DB_HOST = os.getenv("DB_HOST", "sobi-db")
DB_NAME = "airflowdb"
DB_USER = "airflow"
DB_PASSWORD = "airflow123"
DB_PORT = int(os.getenv("DB_PORT", "5432"))

def p(x) -> str:
    return str(x)

SSH_OPTS = (
    "-o BatchMode=yes -o PreferredAuthentications=publickey -o IdentitiesOnly=yes "
    "-o StrictHostKeyChecking=no -o ConnectTimeout=5"
)

def ensure_ssh_key() -> str:
    """RO 마운트된 키를 /tmp로 복사하고 권한 600으로 맞춰 반환"""
    src = "/mnt/ssh/id_ed25519_jetson"
    if not os.path.exists(src):
        raise RuntimeError(f"SSH key not found: {src}")
    tmp_dir = "/tmp/ssh"
    os.makedirs(tmp_dir, exist_ok=True)
    dst = os.path.join(tmp_dir, "jetson_key")
    shutil.copy2(src, dst)
    os.chmod(dst, 0o600)
    return dst

def ssh_test():
    key = ensure_ssh_key()
    host = os.getenv("JETSON_HOST", "host.docker.internal")
    port = os.getenv("JETSON_SSH_PORT", "2222")
    user = os.getenv("JETSON_USER", "ssafy")
    cmd = f'ssh -i {key} -p {port} {SSH_OPTS} {user}@{host} "true"'
    subprocess.run(cmd, shell=True, check=True)

def rsync_push(src_dir: Path, dest_dir_env: str):
    key = ensure_ssh_key()
    host = os.getenv("JETSON_HOST", "host.docker.internal")
    port = os.getenv("JETSON_SSH_PORT", "2222")
    user = os.getenv("JETSON_USER", "ssafy")
    dest = os.getenv(dest_dir_env)
    if not dest:
        raise RuntimeError(f"{dest_dir_env} env required")
    src = p(src_dir).rstrip("/") + "/"
    dest = dest.rstrip("/") + "/"
    cmd = (
        f'rsync -azv --delete --partial --inplace --timeout=300 '
        f'-e "ssh -i {key} -p {port} {SSH_OPTS} -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o TCPKeepAlive=yes" '
        f'{src} {user}@{host}:{dest}'
    )
    subprocess.run(cmd, shell=True, check=True)

# ===============================
# 1) 로더/전처리
# ===============================
def get_kst_today() -> str:
    return datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()

def load_guest_data_from_airflow_db() -> pd.DataFrame:
    """Airflow DB에서 게스트 모델 학습용 데이터 로드 (최근 일주일)"""
    try:
        # Airflow DB 연결
        db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        engine = create_engine(db_url)
        
        # 최근 일주일 데이터 가져오기
        query = """
        SELECT user_id, product_id, product_name, category, price, purchase_date, age, gender
        FROM airflow_data.training_data
        WHERE purchase_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY purchase_date DESC
        """
        
        df = pd.read_sql(query, engine)
        engine.dispose()
        
        if df.empty:
            print("[WARN] Airflow DB에서 최근 일주일 데이터를 가져올 수 없습니다.")
            return pd.DataFrame()
            
        print(f"[INFO] Airflow DB에서 최근 일주일 데이터 {len(df)}개 행 로드 완료")
        return df
        
    except Exception as e:
        print(f"[ERROR] Airflow DB 연결 실패: {e}")
        return pd.DataFrame()

def load_dataframe() -> pd.DataFrame:
    """데이터 로드 메인 함수"""
    # 먼저 Airflow DB에서 시도
    df = load_guest_data_from_airflow_db()
    
    if df.empty:
        print("[WARN] Airflow DB에서 데이터를 가져올 수 없어 CSV 파일을 시도합니다.")
        # CSV 파일에서 로드 시도 (기존 로직)
        csv_path = Path(os.getenv("CSV_PATH", BASE_DIR / "data" / "purchased_history.csv"))
        if csv_path.exists():
            df = pd.read_csv(csv_path)
            if "purchase_date" in df.columns:
                df["purchase_date"] = pd.to_datetime(df["purchase_date"])
                latest_date = df["purchase_date"].max().date()
                df = df[df["purchase_date"].dt.date == latest_date]
                print(f"[INFO] CSV에서 {latest_date} 날짜 데이터 {len(df)}개 행 로드")
            else:
                print("[WARN] CSV에 purchase_date 컬럼이 없습니다.")
                df = pd.DataFrame()
        else:
            print(f"[WARN] CSV 파일을 찾을 수 없습니다: {csv_path}")
            df = pd.DataFrame()
    
    return df

def flatten_receipts(df_receipt: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, row in df_receipt.iterrows():
        session_id = str(row.get("purchased_at"))
        user_id = row.get("user_id")
        
        if pd.isna(row.get("product_list")) or row.get("product_list") == "":
            continue
            
        products = str(row.get("product_list")).split(",")
        for product in products:
            product = product.strip()
            if product:
                rows.append({
                    "session_id": session_id,
                    "user_id": user_id,
                    "product_id": product
                })
    
    return pd.DataFrame(rows)

def create_user_product_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """사용자-상품 매트릭스 생성"""
    user_product = df.groupby(['user_id', 'product_id']).size().reset_index(name='purchase_count')
    matrix = user_product.pivot(index='user_id', columns='product_id', values='purchase_count').fillna(0)
    return matrix

def create_product_features(df: pd.DataFrame) -> pd.DataFrame:
    """상품별 특성 생성 (컬럼 유무에 따라 유연하게)"""
    agg = {'price': ['mean', 'std', 'count']}

    # category가 있으면 최빈값
    if 'category' in df.columns:
        agg['category'] = (lambda x: x.mode().iloc[0] if not x.mode().empty else 'unknown')

    # gender가 있으면 최빈값
    if 'gender' in df.columns:
        agg['gender'] = (lambda x: x.mode().iloc[0] if not x.mode().empty else 'unknown')

    # age가 있으면 평균/표준편차
    if 'age' in df.columns:
        agg['age'] = ['mean', 'std']

    product_features = df.groupby('product_id').agg(agg).reset_index()

    # 컬럼명 평탄화
    product_features.columns = [
        '_'.join(col).strip('_') if isinstance(col, tuple) else col
        for col in product_features.columns
    ]

    # 없는 경우 기본값 채우기
    if 'category_<lambda>' not in product_features.columns:
        product_features['category_<lambda>'] = 'unknown'
    if 'gender_<lambda>' not in product_features.columns:
        product_features['gender_<lambda>'] = 'unknown'
    if 'age_mean' not in product_features.columns:
        product_features['age_mean'] = np.nan
    if 'age_std' not in product_features.columns:
        product_features['age_std'] = np.nan

    # 최종 컬럼 이름 정리 (기존 코드와 호환)
    rename_map = {
        'price_mean': 'avg_price',
        'price_std': 'std_price',
        'price_count': 'purchase_count',
        'category_<lambda>': 'main_category',
        'gender_<lambda>': 'main_gender',
        'age_mean': 'avg_age',
        'age_std': 'std_age',
    }
    product_features = product_features.rename(columns=rename_map)

    return product_features
    
    return product_features

# ===============================
# 2) 모델 학습
# ===============================
def train_guest_model(df_training: pd.DataFrame, experiment_name: str = "guest_recommendation"):
    """게스트 추천 모델 학습 (MLflow 통합)"""
    
    # MLflow 실험 설정
    mlflow.set_experiment(experiment_name)
    
    with mlflow.start_run(run_name=f"guest_model_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
        
        # 하이퍼파라미터 설정
        params = {
            "n_neighbors": 10,
            "metric": "cosine",
            "algorithm": "auto",
            "leaf_size": 30
        }
        
        # MLflow에 파라미터 기록
        mlflow.log_params(params)
        
        print("=== 게스트 모델 학습 시작 ===")
        start_time = time.time()
        
        # 사용자-상품 매트릭스 생성
        user_product_matrix = create_user_product_matrix(df_training)
        print(f"사용자-상품 매트릭스 생성 완료: {user_product_matrix.shape}")
        
        # 상품별 특성 생성
        product_features = create_product_features(df_training)
        print(f"상품별 특성 생성 완료: {product_features.shape}")
        
        # 🎯 기존 모델 확인 및 학습 모드 전환
        existing_model_path = GUEST_LATEST_DIR / "guest_model.pkl"
        existing_tfidf_path = GUEST_LATEST_DIR / "tfidf_vectorizer.pkl"
        
        if existing_model_path.exists() and existing_tfidf_path.exists():
            print("🔄 기존 게스트 모델 발견!")
            print("📚 기존 특성 데이터와 비교하여 효율적 학습...")
            
            try:
                # 기존 모델과 TF-IDF 로드
                existing_model = joblib.load(existing_model_path)
                existing_tfidf = joblib.load(existing_tfidf_path)
                
                # 기존 특성과 새로운 특성 비교
                existing_features = set(existing_tfidf.get_feature_names_out())
                new_features = set(product_features['main_category'].fillna('unknown').astype(str))
                
                print(f"   - 기존 특성 수: {len(existing_features)}")
                print(f"   - 새로운 특성 수: {len(new_features)}")
                print(f"   - 공통 특성 수: {len(existing_features & new_features)}")
                
                # 특성 변화가 크면 새로 학습, 작으면 기존 모델 활용
                feature_change_ratio = len(new_features - existing_features) / len(existing_features)
                
                if feature_change_ratio > 0.3:  # 30% 이상 변화 시
                    print("⚠️ 특성 변화가 큽니다. 전체 재학습을 진행합니다.")
                    raise Exception("특성 변화로 인한 재학습 필요")
                else:
                    print("✅ 특성 변화가 적습니다. 기존 모델을 업데이트합니다.")
                    # 기존 모델 구조 유지, 새로운 데이터로 재학습
                    model = existing_model
                    tfidf = existing_tfidf
                    
                    # 새로운 특성으로 벡터화 (기존 어휘 유지)
                    product_text = product_features['main_category'].fillna('unknown').astype(str)
                    product_vectors = tfidf.transform(product_text)  # fit_transform 대신 transform 사용
                    
                    # 모델 재학습
                    model.fit(product_vectors)
                    print("🔄 기존 모델 업데이트 완료")
                    
            except Exception as e:
                print(f"⚠️ 기존 모델 활용 실패, 새로 학습: {e}")
                # 새로 학습
                model = NearestNeighbors(
                    n_neighbors=params["n_neighbors"],
                    metric=params["metric"],
                    algorithm=params["algorithm"],
                    leaf_size=params["leaf_size"]
                )
                
                # 상품 특성을 TF-IDF로 벡터화
                tfidf = TfidfVectorizer(max_features=1000, stop_words=None)
                product_text = product_features['main_category'].fillna('unknown').astype(str)
                product_vectors = tfidf.fit_transform(product_text)
                
                # 모델 학습
                model.fit(product_vectors)
                print("🆕 새로운 모델 학습 완료")
        else:
            print("🆕 새로운 게스트 모델 학습 시작")
            # 새로 학습
            model = NearestNeighbors(
                n_neighbors=params["n_neighbors"],
                metric=params["metric"],
                algorithm=params["algorithm"],
                leaf_size=params["leaf_size"]
            )
            
            # 상품 특성을 TF-IDF로 벡터화
            tfidf = TfidfVectorizer(max_features=1000, stop_words=None)
            product_text = product_features['main_category'].fillna('unknown').astype(str)
            product_vectors = tfidf.fit_transform(product_text)
            
            # 모델 학습
            model.fit(product_vectors)
            print("🆕 새로운 모델 학습 완료")
        
        # 학습 시간 기록
        training_time = time.time() - start_time
        
        # MLflow에 메트릭 기록
        mlflow.log_metric("training_time_seconds", training_time)
        mlflow.log_metric("n_users", len(user_product_matrix))
        mlflow.log_metric("n_products", len(product_features))
        mlflow.log_metric("n_neighbors", params["n_neighbors"])
        
        # 모델 저장
        model_path = GUEST_EXPORT_DIR / "guest_model.pkl"
        tfidf_path = GUEST_EXPORT_DIR / "tfidf_vectorizer.pkl"
        product_features_path = GUEST_EXPORT_DIR / "product_features.pkl"
        user_product_matrix_path = GUEST_EXPORT_DIR / "user_product_matrix.pkl"
        
        joblib.dump(model, model_path)
        joblib.dump(tfidf, tfidf_path)
        joblib.dump(product_features, product_features_path)
        joblib.dump(user_product_matrix, user_product_matrix_path)
        
        # MLflow에 모델 아티팩트 기록
        mlflow.log_artifact(str(model_path), "models")
        mlflow.log_artifact(str(tfidf_path), "models")
        mlflow.log_artifact(str(product_features_path), "models")
        mlflow.log_artifact(str(user_product_matrix_path), "models")
        
        # 모델 정보를 MLflow에 등록 (API 오류 방지를 위해 제거)
        # mlflow.sklearn.log_model(model, "guest_recommendation_model")
        
        # 🎯 모델 아카이브 및 서빙용 복사
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 1. 이전 모델을 아카이브로 이동
        if (GUEST_LATEST_DIR / "guest_model.pkl").exists():
            archive_dir = GUEST_ARCHIVE_DIR / f"guest_models_{timestamp}"
            archive_dir.mkdir(parents=True, exist_ok=True)
            
            for file_path in GUEST_LATEST_DIR.glob("*"):
                if file_path.is_file():
                    shutil.copy2(file_path, archive_dir / file_path.name)
            print(f"📦 이전 모델을 아카이브에 저장: {archive_dir}")
        
        # 2. 서빙용 디렉토리에 복사
        for file_path in GUEST_LATEST_DIR.glob("*"):
            if file_path.is_file():
                shutil.copy2(file_path, GUEST_SERVING_DIR / file_path.name)
        print(f"🚀 서빙용 모델 준비 완료: {GUEST_SERVING_DIR}")
        
        print(f"✅ 게스트 모델 학습 완료!")
        print(f"   - 학습 시간: {training_time:.2f}초")
        print(f"   - 사용자 수: {len(user_product_matrix)}")
        print(f"   - 상품 수: {len(product_features)}")
        print(f"   - 학습 모드: {'기존 모델 업데이트' if existing_model_path.exists() else '새로운 모델 학습'}")
        print(f"   - 모델 저장 위치: {GUEST_EXPORT_DIR}")
        print(f"   - 아카이브 위치: {GUEST_ARCHIVE_DIR}")
        print(f"   - 서빙 위치: {GUEST_SERVING_DIR}")
        
        return model, tfidf, product_features, user_product_matrix

# ===============================
# 3) 메인 실행
# ===============================
def main():
    """메인 실행 함수"""
    try:
        print("=== 게스트 추천 모델 학습 시작 ===")
        
        # 전처리된 데이터 로드 (Airflow DB에서)
        print("전처리된 데이터 로드 중... (최근 일주일)")
        df_training = load_dataframe()
        
        if df_training.empty:
            print("⚠️ Airflow DB에서 최근 일주일 전처리된 데이터를 가져올 수 없습니다.")
            return
        
        print(f"✅ 전처리된 데이터 로드 완료: {len(df_training)}건 (최근 일주일)")
        
        # 모델 학습
        model, tfidf, product_features, user_product_matrix = train_guest_model(
            df_training, 
            experiment_name="guest_recommendation"
        )
        
        # SSH 연결 테스트 (Jetson 전송 준비)
        if os.getenv("JETSON_PUSH", "0") == "1":
            print("Jetson 연결 테스트 중...")
            try:
                ssh_test()
                print("✅ Jetson 연결 성공")
            except Exception as e:
                print(f"⚠️ Jetson 연결 실패: {e}")
        
        print("=== 게스트 모델 학습 완료 ===")
        
    except Exception as e:
        print(f"❌ 게스트 모델 학습 실패: {e}")
        traceback.print_exc()
        raise

if __name__ == "__main__":
    main()
