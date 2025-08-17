#!/usr/bin/env python3
"""
MLflow 테스트 실행 스크립트

이 스크립트는 mlflow_runs 패키지의 모든 테스트를 실행합니다.
"""

import sys
import os
from pathlib import Path

# 현재 디렉토리를 Python 경로에 추가
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir.parent))

def run_tests():
    """모든 테스트 실행"""
    print("MLflow 테스트 실행 시작")
    print("=" * 50)
    
    try:
        # 기본 테스트 실행
        from test_mlflow import main as test_main
        success = test_main()
        
        if success:
            print("\n🎉 모든 테스트가 성공적으로 완료되었습니다!")
        else:
            print("\n⚠️  일부 테스트가 실패했습니다.")
        
        return success
        
    except Exception as e:
        print(f"\n❌ 테스트 실행 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
