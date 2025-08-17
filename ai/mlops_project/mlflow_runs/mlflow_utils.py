import os
import mlflow
import mlflow.tensorflow
import mlflow.sklearn
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import json

class MLflowManager:
    """MLflow 실험 및 모델 관리를 위한 유틸리티 클래스"""
    
    def __init__(self, 
                 tracking_uri: Optional[str] = None,
                 experiment_name: str = "mlops_project",
                 artifact_location: Optional[str] = None):
        """
        MLflow 매니저 초기화
        
        Args:
            tracking_uri: MLflow 서버 URI (기본값: 환경변수 MLFLOW_TRACKING_URI)
            experiment_name: 실험 이름
            artifact_location: 아티팩트 저장 위치
        """
        self.tracking_uri = tracking_uri or os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
        self.experiment_name = experiment_name
        self.artifact_location = artifact_location
        
        # MLflow 설정
        mlflow.set_tracking_uri(self.tracking_uri)
        mlflow.set_experiment(self.experiment_name)
        
        print(f"[MLflow] Tracking URI: {self.tracking_uri}")
        print(f"[MLflow] Experiment: {self.experiment_name}")
    
    def start_run(self, 
                  run_name: Optional[str] = None,
                  tags: Optional[Dict[str, str]] = None,
                  description: Optional[str] = None) -> mlflow.ActiveRun:
        """
        MLflow 실험 실행 시작
        
        Args:
            run_name: 실행 이름
            tags: 태그 딕셔너리
            description: 실행 설명
            
        Returns:
            MLflow ActiveRun 객체
        """
        tags = tags or {}
        tags.update({
            "project": "mlops",
            "created_at": datetime.now().isoformat()
        })
        
        return mlflow.start_run(
            run_name=run_name,
            tags=tags,
            description=description
        )
    
    def log_parameters(self, params: Dict[str, Any]):
        """하이퍼파라미터 로깅"""
        mlflow.log_params(params)
        print(f"[MLflow] Parameters logged: {list(params.keys())}")
    
    def log_metrics(self, metrics: Dict[str, float], step: Optional[int] = None):
        """메트릭 로깅"""
        mlflow.log_metrics(metrics, step=step)
        print(f"[MLflow] Metrics logged: {list(metrics.keys())}")
    
    def log_model(self, 
                  model, 
                  artifact_path: str,
                  model_type: str = "tensorflow",
                  **kwargs):
        """
        모델 로깅
        
        Args:
            model: 저장할 모델
            artifact_path: 아티팩트 경로
            model_type: 모델 타입 (tensorflow, sklearn, pytorch 등)
            **kwargs: 추가 인자들
        """
        try:
            if model_type == "tensorflow":
                mlflow.tensorflow.log_model(model, artifact_path, **kwargs)
            elif model_type == "sklearn":
                mlflow.sklearn.log_model(model, artifact_path, **kwargs)
            else:
                mlflow.log_artifacts(model, artifact_path)
            
            print(f"[MLflow] Model logged: {artifact_path}")
        except Exception as e:
            print(f"[MLflow] Model logging failed: {e}")
    
    def log_artifacts(self, local_path: str, artifact_path: Optional[str] = None):
        """아티팩트 로깅"""
        mlflow.log_artifacts(local_path, artifact_path)
        print(f"[MLflow] Artifacts logged: {local_path}")
    
    def log_dataframe(self, df, artifact_path: str, name: str = "data"):
        """데이터프레임을 CSV로 로깅"""
        csv_path = f"/tmp/{name}.csv"
        df.to_csv(csv_path, index=False)
        mlflow.log_artifact(csv_path, artifact_path)
        os.remove(csv_path)
        print(f"[MLflow] DataFrame logged: {artifact_path}/{name}.csv")
    
    def save_model_info(self, 
                       model_path: str, 
                       model_info: Dict[str, Any],
                       artifact_path: str = "model_info"):
        """모델 정보를 JSON으로 저장"""
        info_path = "/tmp/model_info.json"
        with open(info_path, 'w') as f:
            json.dump(model_info, f, indent=2, default=str)
        
        mlflow.log_artifact(info_path, artifact_path)
        os.remove(info_path)
        print(f"[MLflow] Model info logged: {artifact_path}/model_info.json")
    
    def end_run(self):
        """실행 종료"""
        mlflow.end_run()
        print("[MLflow] Run ended")

def get_mlflow_manager(experiment_name: str = "mlops_project") -> MLflowManager:
    """MLflow 매니저 인스턴스 반환"""
    return MLflowManager(experiment_name=experiment_name)

# 편의 함수들
def log_training_run(model, 
                    params: Dict[str, Any],
                    metrics: Dict[str, float],
                    model_path: str,
                    run_name: Optional[str] = None,
                    tags: Optional[Dict[str, str]] = None):
    """
    학습 실행을 위한 편의 함수
    
    Args:
        model: 학습된 모델
        params: 하이퍼파라미터
        metrics: 성능 메트릭
        model_path: 모델 저장 경로
        run_name: 실행 이름
        tags: 추가 태그
    """
    mlflow_manager = get_mlflow_manager()
    
    with mlflow_manager.start_run(run_name=run_name, tags=tags) as run:
        # 파라미터 로깅
        mlflow_manager.log_parameters(params)
        
        # 메트릭 로깅
        mlflow_manager.log_metrics(metrics)
        
        # 모델 로깅
        mlflow_manager.log_model(model, "model")
        
        # 모델 정보 저장
        model_info = {
            "model_path": model_path,
            "run_id": run.info.run_id,
            "experiment_id": run.info.experiment_id,
            "status": run.info.status,
            "start_time": run.info.start_time,
            "end_time": run.info.end_time
        }
        mlflow_manager.save_model_info(model_path, model_info)
        
        print(f"[MLflow] Training run completed: {run.info.run_id}")
        return run.info.run_id

if __name__ == "__main__":
    # 테스트 코드
    manager = get_mlflow_manager("test_experiment")
    
    with manager.start_run(run_name="test_run") as run:
        manager.log_parameters({"learning_rate": 0.01, "epochs": 100})
        manager.log_metrics({"accuracy": 0.95, "loss": 0.05})
        print(f"Test run ID: {run.info.run_id}")
