# MLflow Runs Package

이 패키지는 MLOPS 프로젝트에서 MLflow를 사용하여 머신러닝 실험을 관리하고 모델을 추적하는 도구들을 제공합니다.

## 📁 파일 구조

```
mlflow_runs/
├── __init__.py                 # 패키지 초기화 파일
├── mlflow_utils.py            # MLflow 유틸리티 모듈
├── mlflow_experiment_manager.py # 실험 관리 도구
├── mlflow_requirements.txt    # 의존성 목록
├── MLFLOW_USAGE.md           # 상세 사용법 가이드
├── test_mlflow.py            # 기능 테스트 스크립트
├── run_tests.py              # 테스트 실행 스크립트
├── example_usage.py          # 사용 예제 스크립트
└── README.md                 # 이 파일
```

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
pip install -r mlflow_requirements.txt
```

### 2. 기본 사용법

```python
from mlflow_runs.mlflow_utils import get_mlflow_manager

# MLflow 매니저 초기화
mlflow_manager = get_mlflow_manager("my_experiment")

# 실험 실행 시작
with mlflow_manager.start_run(run_name="test_run") as run:
    # 파라미터 로깅
    mlflow_manager.log_parameters({"learning_rate": 0.01, "epochs": 100})
    
    # 모델 학습
    model = train_model()
    
    # 메트릭 로깅
    mlflow_manager.log_metrics({"accuracy": 0.95, "loss": 0.05})
    
    # 모델 로깅
    mlflow_manager.log_model(model, "model", model_type="tensorflow")
    
    print(f"Run ID: {run.info.run_id}")
```

### 3. 테스트 실행

```bash
# 모든 테스트 실행
python mlflow_runs/run_tests.py

# 개별 테스트 실행
python mlflow_runs/test_mlflow.py
```

### 4. 사용 예제 실행

```bash
python mlflow_runs/example_usage.py
```

## 🔧 주요 기능

### MLflowManager 클래스

- **실험 실행 관리**: `start_run()`, `end_run()`
- **파라미터 로깅**: `log_parameters()`
- **메트릭 로깅**: `log_metrics()`
- **모델 로깅**: `log_model()`
- **아티팩트 로깅**: `log_artifacts()`, `log_dataframe()`

### MLflowExperimentManager 클래스

- **실험 관리**: 실험 목록 조회, 실행 비교
- **모델 관리**: 모델 등록, 배포, 버전 관리
- **리포트 생성**: HTML 형태의 실험 결과 리포트

## 📊 사용 예제

### 실험 관리

```bash
# 실험 목록 조회
python mlflow_runs/mlflow_experiment_manager.py --action list_experiments

# 실행 목록 조회
python mlflow_runs/mlflow_experiment_manager.py --action list_runs --experiment mlops_project

# 최고 성능 실행 찾기
python mlflow_runs/mlflow_experiment_manager.py --action best_run --metric final_accuracy

# 실험 리포트 생성
python mlflow_runs/mlflow_experiment_manager.py --action report --output_path ./report.html
```

### 모델 배포

```bash
# 모델 등록
python mlflow_runs/mlflow_experiment_manager.py --action register --run_ids run_id --model_name my_model

# 모델 배포
python mlflow_runs/mlflow_experiment_manager.py --action deploy --model_name my_model
```

## 🔗 다른 모듈에서 사용

### recommender 모듈에서

```python
import sys
sys.path.append('/opt/mlops')
from mlflow_runs.mlflow_utils import get_mlflow_manager

mlflow_manager = get_mlflow_manager("member_recommendation")
```

### preprocessing 모듈에서

```python
import sys
sys.path.append('/opt/mlops')
from mlflow_runs.mlflow_utils import get_mlflow_manager

mlflow_manager = get_mlflow_manager("data_preprocessing")
```

## 📝 환경 변수

```bash
# MLflow 서버 URI
export MLFLOW_TRACKING_URI=http://localhost:5000

# 기본 실험 이름
export MLFLOW_EXPERIMENT_NAME=mlops_project
```

## 🐛 문제 해결

### Import 오류

```python
# 올바른 import 방법
from mlflow_runs.mlflow_utils import get_mlflow_manager

# 잘못된 import 방법
from mlflow_utils import get_mlflow_manager  # ❌
```

### 경로 문제

```python
# Python 경로에 mlflow_runs 상위 디렉토리 추가
import sys
sys.path.append('/opt/mlops')  # mlflow_runs의 상위 디렉토리
```

## 📚 추가 자료

- [MLFLOW_USAGE.md](MLFLOW_USAGE.md): 상세한 사용법 가이드
- [MLflow 공식 문서](https://mlflow.org/docs/latest/index.html)
- [MLflow Python API](https://mlflow.org/docs/latest/python_api/index.html)

## 🤝 기여

이 패키지에 대한 개선 사항이나 버그 리포트가 있으면 팀 리더에게 문의하세요.
