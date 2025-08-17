#!/usr/bin/env python3
"""
주간 리포트 생성 및 메일 발송 실행 스크립트
Airflow DockerOperator에서 실행됨
"""

import os
import sys
import logging
from pathlib import Path

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """메인 실행 함수"""
    try:
        logger.info("주간 리포트 생성 시작")
        
        # 환경 변수 확인
        required_envs = ['DB_URL', 'OPENAI_API_KEY', 'REPORT_SENDER_EMAIL', 'REPORT_SENDER_PASSWORD']
        missing_envs = [env for env in required_envs if not os.getenv(env)]
        
        if missing_envs:
            raise ValueError(f"필수 환경 변수가 누락되었습니다: {missing_envs}")
        
        # 리포트 생성
        from generate_report import generate_report
        report_path = generate_report()
        
        if not report_path:
            raise Exception("리포트 생성 실패: 경로가 반환되지 않음")
        
        if not os.path.exists(report_path):
            raise Exception(f"리포트 파일이 존재하지 않습니다: {report_path}")
        
        logger.info(f"리포트 생성 완료: {report_path}")
        
        # 메일 발송
        from email_sender import send_email
        receiver = os.getenv('REPORT_RECEIVER', 'you@example.com')
        
        send_email(report_path, receiver)
        logger.info(f"메일 발송 완료: {receiver}")
        
        print(f"✅ 주간리포트 생성 및 메일 발송 완료: {report_path}")
        return 0
        
    except ImportError as e:
        logger.error(f"모듈 import 오류: {e}")
        print(f"❌ 모듈 import 오류: {e}")
        return 1
        
    except Exception as e:
        logger.error(f"에러 발생: {e}")
        print(f"❌ 에러 발생: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
