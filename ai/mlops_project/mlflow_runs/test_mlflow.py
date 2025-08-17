#!/usr/bin/env python3
"""
MLflow 기능 테스트 스크립트

이 스크립트는 MLflow의 기본 기능들을 테스트합니다.
"""

import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime

# MLflow 유틸리티 import (상대 경로로 수정)
from .mlflow_utils import get_mlflow_manager

def test_basic_logging():
    """기본 로깅 기능 테스트"""
    print("=== 기본 로깅 기능 테스트 ===")
    
    mlflow_manager = get_mlflow_manager("test_experiment")
    
    with mlflow_manager.start_run(run_name="basic_test") as run:
        # 파라미터 로깅
        params = {
            "test_param1": "value1",
            "test_param2": 42,
            "test_param3": 3.14
        }
        mlflow_manager.log_parameters(params)
        
        # 메트릭 로깅
        metrics = {
            "test_metric1": 0.95,
            "test_metric2": 0.05
        }
        mlflow_manager.log_metrics(metrics)
        
        # 더미 데이터프레임 로깅
        df = pd.DataFrame({
            "col1": [1, 2, 3],
            "col2": ["a", "b", "c"]
        })
        mlflow_manager.log_dataframe(df, "test_data", "dummy_data")
        
        print(f"✓ 기본 로깅 테스트 완료 - Run ID: {run.info.run_id}")
        return run.info.run_id

def test_model_logging():
    """모델 로깅 기능 테스트"""
    print("\n=== 모델 로깅 기능 테스트 ===")
    
    mlflow_manager = get_mlflow_manager("test_experiment")
    
    with mlflow_manager.start_run(run_name="model_test") as run:
        # 더미 모델 정보
        model_info = {
            "model_type": "test_model",
            "version": "1.0.0",
            "description": "Test model for MLflow",
            "created_at": datetime.now().isoformat()
        }
        
        # 모델 정보 저장
        mlflow_manager.save_model_info("/tmp", model_info, "test_model_info")
        
        # 더미 아티팩트 로깅
        dummy_file = "/tmp/test_artifact.txt"
        with open(dummy_file, 'w') as f:
            f.write("This is a test artifact")
        
        mlflow_manager.log_artifacts(dummy_file, "test_artifacts")
        
        # 파일 정리
        os.remove(dummy_file)
        
        print(f"✓ 모델 로깅 테스트 완료 - Run ID: {run.info.run_id}")
        return run.info.run_id

def test_experiment_manager():
    """실험 관리 기능 테스트"""
    print("\n=== 실험 관리 기능 테스트 ===")
    
    from .mlflow_experiment_manager import MLflowExperimentManager
    
    manager = MLflowExperimentManager("test_experiment")
    
    # 실험 목록 조회
    experiments = manager.list_experiments()
    print(f"✓ 실험 목록 조회: {len(experiments)}개 실험")
    
    # 실행 목록 조회
    runs = manager.list_runs("test_experiment")
    print(f"✓ 실행 목록 조회: {len(runs)}개 실행")
    
    if runs:
        # 첫 번째 실행 정보 출력
        first_run = runs[0]
        print(f"✓ 첫 번째 실행: {first_run['run_id']}")
        print(f"  - 상태: {first_run['status']}")
        print(f"  - 파라미터: {len(first_run['parameters'])}개")
        print(f"  - 메트릭: {len(first_run['metrics'])}개")
    
    return True

def test_mlflow_connection():
    """MLflow 연결 테스트"""
    print("\n=== MLflow 연결 테스트 ===")
    
    try:
        import mlflow
        
        # MLflow 서버 상태 확인
        tracking_uri = mlflow.get_tracking_uri()
        print(f"✓ MLflow Tracking URI: {tracking_uri}")
        
        # 실험 목록 확인
        experiments = mlflow.search_experiments()
        print(f"✓ 연결된 실험 수: {len(experiments)}")
        
        return True
        
    except Exception as e:
        print(f"✗ MLflow 연결 실패: {e}")
        return False

def main():
    """메인 테스트 함수"""
    print("MLflow 기능 테스트 시작")
    print("=" * 50)
    
    test_results = []
    
    # 1. MLflow 연결 테스트
    test_results.append(("연결 테스트", test_mlflow_connection()))
    
    # 2. 기본 로깅 테스트
    try:
        run_id = test_basic_logging()
        test_results.append(("기본 로깅", True))
    except Exception as e:
        print(f"✗ 기본 로깅 테스트 실패: {e}")
        test_results.append(("기본 로깅", False))
    
    # 3. 모델 로깅 테스트
    try:
        run_id = test_model_logging()
        test_results.append(("모델 로깅", True))
    except Exception as e:
        print(f"✗ 모델 로깅 테스트 실패: {e}")
        test_results.append(("모델 로깅", False))
    
    # 4. 실험 관리 테스트
    try:
        test_experiment_manager()
        test_results.append(("실험 관리", True))
    except Exception as e:
        print(f"✗ 실험 관리 테스트 실패: {e}")
        test_results.append(("실험 관리", False))
    
    # 결과 요약
    print("\n" + "=" * 50)
    print("테스트 결과 요약:")
    print("=" * 50)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n총 {total}개 테스트 중 {passed}개 통과")
    
    if passed == total:
        print("🎉 모든 테스트가 통과했습니다!")
    else:
        print("⚠️  일부 테스트가 실패했습니다.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
