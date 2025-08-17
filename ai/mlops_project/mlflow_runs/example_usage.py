#!/usr/bin/env python3
"""
MLflow 사용 예제 스크립트

이 스크립트는 MLflow의 기본 기능들을 사용하는 방법을 보여줍니다.
"""

import sys
import os
from pathlib import Path
import numpy as np
import pandas as pd
from datetime import datetime

# 현재 디렉토리를 Python 경로에 추가
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir.parent))

def example_basic_logging():
    """기본 로깅 예제"""
    print("=== 기본 로깅 예제 ===")
    
    try:
        from mlflow_runs.mlflow_utils import get_mlflow_manager
        
        # MLflow 매니저 초기화
        mlflow_manager = get_mlflow_manager("example_experiment")
        
        with mlflow_manager.start_run(run_name="basic_example") as run:
            # 파라미터 로깅
            params = {
                "learning_rate": 0.01,
                "batch_size": 32,
                "epochs": 100,
                "model_type": "neural_network"
            }
            mlflow_manager.log_parameters(params)
            
            # 가상의 학습 과정
            print("가상 학습 진행 중...")
            for epoch in range(5):
                # 가상 메트릭
                accuracy = 0.5 + (epoch * 0.1)
                loss = 1.0 - (epoch * 0.15)
                
                mlflow_manager.log_metrics({
                    "accuracy": accuracy,
                    "loss": loss
                }, step=epoch)
                
                print(f"Epoch {epoch+1}: accuracy={accuracy:.3f}, loss={loss:.3f}")
            
            # 데이터프레임 로깅 예제
            df = pd.DataFrame({
                "feature1": np.random.randn(100),
                "feature2": np.random.randn(100),
                "target": np.random.randint(0, 2, 100)
            })
            mlflow_manager.log_dataframe(df, "data", "sample_dataset")
            
            print(f"✓ 기본 로깅 예제 완료 - Run ID: {run.info.run_id}")
            return run.info.run_id
            
    except Exception as e:
        print(f"✗ 기본 로깅 예제 실패: {e}")
        return None

def example_experiment_management():
    """실험 관리 예제"""
    print("\n=== 실험 관리 예제 ===")
    
    try:
        from mlflow_runs.mlflow_experiment_manager import MLflowExperimentManager
        
        # 실험 관리자 초기화
        manager = MLflowExperimentManager("example_experiment")
        
        # 실험 목록 조회
        experiments = manager.list_experiments()
        print(f"✓ 실험 목록 조회: {len(experiments)}개 실험")
        
        # 실행 목록 조회
        runs = manager.list_runs("example_experiment")
        print(f"✓ 실행 목록 조회: {len(runs)}개 실행")
        
        if runs:
            print("\n실행 정보:")
            for i, run in enumerate(runs[:3]):  # 최대 3개만 출력
                print(f"  {i+1}. Run ID: {run['run_id']}")
                print(f"     - 상태: {run['status']}")
                print(f"     - 파라미터: {len(run['parameters'])}개")
                print(f"     - 메트릭: {len(run['metrics'])}개")
        
        return True
        
    except Exception as e:
        print(f"✗ 실험 관리 예제 실패: {e}")
        return False

def example_model_tracking():
    """모델 추적 예제"""
    print("\n=== 모델 추적 예제 ===")
    
    try:
        from mlflow_runs.mlflow_utils import get_mlflow_manager
        
        mlflow_manager = get_mlflow_manager("model_tracking_example")
        
        with mlflow_manager.start_run(run_name="model_tracking") as run:
            # 모델 정보
            model_info = {
                "model_type": "example_model",
                "version": "1.0.0",
                "description": "Example model for demonstration",
                "created_at": datetime.now().isoformat(),
                "framework": "tensorflow",
                "input_shape": [None, 10],
                "output_shape": [None, 1]
            }
            
            # 모델 정보 로깅
            mlflow_manager.save_model_info("/tmp", model_info, "model_metadata")
            
            # 가상 모델 파일 생성
            model_file = "/tmp/example_model.txt"
            with open(model_file, 'w') as f:
                f.write("This is an example model file")
            
            # 모델 파일 로깅
            mlflow_manager.log_artifacts(model_file, "model_files")
            
            # 파일 정리
            os.remove(model_file)
            
            print(f"✓ 모델 추적 예제 완료 - Run ID: {run.info.run_id}")
            return run.info.run_id
            
    except Exception as e:
        print(f"✗ 모델 추적 예제 실패: {e}")
        return None

def main():
    """메인 실행 함수"""
    print("MLflow 사용 예제 시작")
    print("=" * 60)
    
    examples = [
        ("기본 로깅", example_basic_logging),
        ("실험 관리", example_experiment_management),
        ("모델 추적", example_model_tracking)
    ]
    
    results = []
    
    for name, func in examples:
        try:
            result = func()
            results.append((name, True, result))
        except Exception as e:
            print(f"✗ {name} 예제 실행 중 오류: {e}")
            results.append((name, False, None))
    
    # 결과 요약
    print("\n" + "=" * 60)
    print("예제 실행 결과 요약:")
    print("=" * 60)
    
    for name, success, result in results:
        status = "✓ 성공" if success else "✗ 실패"
        print(f"{name}: {status}")
        if result and name == "기본 로깅":
            print(f"  - Run ID: {result}")
    
    success_count = sum(1 for _, success, _ in results if success)
    print(f"\n총 {len(examples)}개 예제 중 {success_count}개 성공")
    
    if success_count == len(examples):
        print("🎉 모든 예제가 성공적으로 실행되었습니다!")
    else:
        print("⚠️  일부 예제가 실패했습니다.")

if __name__ == "__main__":
    main()
