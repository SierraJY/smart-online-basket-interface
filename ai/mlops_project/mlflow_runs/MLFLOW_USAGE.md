# MLflow 사용법 가이드

이 문서는 MLOPS 프로젝트에서 MLflow를 사용하는 방법을 설명합니다.

## 📋 목차

1. [개요](#개요)
2. [설치 및 설정](#설치-및-설정)
3. [기본 사용법](#기본-사용법)
4. [실험 관리](#실험-관리)
5. [모델 배포](#모델-배포)
6. [고급 기능](#고급-기능)
7. [문제 해결](#문제-해결)

## 🎯 개요

MLflow는 머신러닝 실험을 추적하고, 모델을 관리하고, 배포하는 통합 플랫폼입니다.

### 주요 기능

- **실험 추적**: 하이퍼파라미터, 메트릭, 아티팩트 로깅
- **모델 관리**: 모델 버전 관리 및 레지스트리
- **모델 배포**: 다양한 환경으로 모델 배포
- **재현성**: 실험 환경 및 의존성 관리

## 🚀 설치 및 설정

### 1. 의존성 설치

```bash
pip install -r mlflow_requirements.txt
```

### 2. 환경 변수 설정

```bash
export MLFLOW_TRACKING_URI=http://localhost:5000
export MLFLOW_EXPERIMENT_NAME=mlops_project
```

### 3. MLflow 서버 시작

```bash
# Docker Compose로 시작 (권장)
docker-compose up mlflow

# 또는 직접 시작
mlflow server --backend-store-uri postgresql://mlflow:mlflow@localhost:5432/mlflow \
              --artifacts-destination ./mlflow_artifacts \
              --host 0.0.0.0 --port 5000
```

## 📚 기본 사용법

### 1. MLflow 유틸리티 사용

```python
from mlflow_utils import get_mlflow_manager

# MLflow 매니저 초기화
mlflow_manager = get_mlflow_manager("my_experiment")

# 실험 실행 시작
with mlflow_manager.start_run(run_name="test_run") as run:
    # 파라미터 로깅
    mlflow_manager.log_parameters({
        "learning_rate": 0.01,
        "epochs": 100,
        "batch_size": 32
    })
    
    # 모델 학습
    model = train_model()
    
    # 메트릭 로깅
    mlflow_manager.log_metrics({
        "accuracy": 0.95,
        "loss": 0.05
    })
    
    # 모델 로깅
    mlflow_manager.log_model(model, "model", model_type="tensorflow")
    
    print(f"Run ID: {run.info.run_id}")
```

### 2. 간단한 학습 실행

```python
from mlflow_utils import log_training_run

# 모델 학습 및 로깅
run_id = log_training_run(
    model=trained_model,
    params={"learning_rate": 0.01, "epochs": 100},
    metrics={"accuracy": 0.95, "loss": 0.05},
    model_path="/path/to/model",
    run_name="my_training_run"
)
```

## 🔬 실험 관리

### 1. 실험 목록 조회

```bash
python mlflow_experiment_manager.py --action list_experiments
```

### 2. 실행 목록 조회

```bash
python mlflow_experiment_manager.py --action list_runs --experiment mlops_project
```

### 3. 최고 성능 실행 찾기

```bash
python mlflow_experiment_manager.py --action best_run --metric final_accuracy
```

### 4. 실행 결과 비교

```bash
python mlflow_experiment_manager.py --action compare --run_ids run1 run2 run3
```

### 5. 실험 리포트 생성

```bash
python mlflow_experiment_manager.py --action report --output_path ./experiment_report.html
```

## 🚀 모델 배포

### 1. 모델 등록

```bash
python mlflow_experiment_manager.py --action register --run_ids run_id --model_name my_model
```

### 2. 모델 배포

```bash
python mlflow_experiment_manager.py --action deploy --model_name my_model
```

### 3. Python에서 모델 로딩

```python
import mlflow

# 모델 로딩
loaded_model = mlflow.pyfunc.load_model("models:/my_model/Production")

# 예측
predictions = loaded_model.predict(input_data)
```

## 🎨 고급 기능

### 1. 커스텀 아티팩트 로깅

```python
# 데이터프레임 로깅
mlflow_manager.log_dataframe(df, "data", "training_data")

# 일반 아티팩트 로깅
mlflow_manager.log_artifacts("/path/to/files", "artifacts")

# 모델 정보 저장
model_info = {
    "model_type": "recommendation",
    "version": "1.0.0",
    "description": "Two-tower recommendation model"
}
mlflow_manager.save_model_info("/path/to/model", model_info, "model_info")
```

### 2. 실험 필터링

```python
# 특정 조건으로 실행 검색
runs = mlflow_manager.list_runs(
    filter_string="metrics.final_accuracy > 0.9 and params.epochs > 50"
)
```

### 3. 모델 버전 관리

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# 모델 버전 목록
versions = client.search_model_versions("name='my_model'")

# 특정 버전 정보
version_info = client.get_model_version("my_model", 1)

# 스테이지 변경
client.transition_model_version_stage(
    name="my_model",
    version=1,
    stage="Production"
)
```

## 🔧 문제 해결

### 1. 연결 오류

**문제**: MLflow 서버에 연결할 수 없음

**해결방법**:
```bash
# MLflow 서버 상태 확인
curl http://localhost:5000/health

# 환경 변수 확인
echo $MLFLOW_TRACKING_URI

# Docker 컨테이너 상태 확인
docker ps | grep mlflow
```

### 2. 권한 오류

**문제**: PostgreSQL 연결 권한 오류

**해결방법**:
```sql
-- PostgreSQL에서 권한 부여
GRANT ALL PRIVILEGES ON SCHEMA public TO mlflow;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mlflow;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mlflow;
```

### 3. 메모리 부족

**문제**: 대용량 모델 로깅 시 메모리 부족

**해결방법**:
```python
# 모델을 청크 단위로 로깅
mlflow_manager.log_artifacts("/path/to/model", "model")

# 또는 모델 가중치만 로깅
mlflow_manager.log_artifacts("/path/to/weights", "weights")
```

## 📊 모니터링 및 대시보드

### 1. MLflow UI 접근

브라우저에서 `http://localhost:5000` 접속

### 2. 주요 화면

- **Experiments**: 실험 목록 및 비교
- **Models**: 모델 레지스트리
- **Runs**: 실행 상세 정보
- **Artifacts**: 파일 및 모델 저장소

### 3. 메트릭 시각화

```python
# 학습 과정 메트릭 로깅
for epoch in range(epochs):
    metrics = train_epoch()
    mlflow_manager.log_metrics(metrics, step=epoch)
```

## 🔄 CI/CD 통합

### 1. GitHub Actions 예시

```yaml
name: MLflow Model Training

on:
  push:
    branches: [main]

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      
      - name: Install dependencies
        run: pip install -r mlflow_requirements.txt
      
      - name: Train model
        env:
          MLFLOW_TRACKING_URI: ${{ secrets.MLFLOW_TRACKING_URI }}
        run: python train_member_recommend_mlflow.py
```

### 2. 모델 자동 배포

```python
# 학습 완료 후 자동 배포
if metrics["final_accuracy"] > 0.9:
    mlflow_manager.deploy_model("my_model", stage="Production")
```

## 📝 모범 사례

### 1. 실험 명명 규칙

```
{model_type}_{date}_{description}
예: member_recommend_20241201_high_lr
```

### 2. 태그 활용

```python
tags = {
    "project": "mlops",
    "model_type": "recommendation",
    "data_version": "v1.2.0",
    "team": "ai_team"
}
```

### 3. 메트릭 표준화

```python
# 항상 포함할 메트릭
standard_metrics = {
    "final_accuracy": accuracy,
    "final_loss": loss,
    "training_time": training_time,
    "model_size": model_size
}
```

## 📚 추가 자료

- [MLflow 공식 문서](https://mlflow.org/docs/latest/index.html)
- [MLflow Python API](https://mlflow.org/docs/latest/python_api/index.html)
- [MLflow 예제](https://github.com/mlflow/mlflow/tree/master/examples)

## 🆘 지원

문제가 발생하면 다음을 확인하세요:

1. MLflow 서버 상태
2. 환경 변수 설정
3. 의존성 버전 호환성
4. 로그 파일 확인

추가 지원이 필요하면 팀 리더에게 문의하세요.
