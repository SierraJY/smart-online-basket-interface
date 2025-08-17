"""
한글 폰트 설정 모듈
matplotlib에서 한글이 제대로 표시되도록 폰트를 설정합니다.
"""
import matplotlib
from matplotlib import rcParams
import os

def setup_korean_fonts():
    """한글 폰트 설정 (한 번만 실행하면 됨)"""
    # matplotlib 캐시 디렉토리 설정
    cache_dir = os.getenv("MPLCONFIGDIR", "/tmp/mplconfig")
    os.makedirs(cache_dir, exist_ok=True)

    # 폰트 패밀리 설정 (NanumGothic만 명확히 지정)
    rcParams["font.family"] = [
        "NanumGothic"
    ]
    rcParams["axes.unicode_minus"] = False  # 음수 기호 깨짐 방지

    print("[INFO] 한글 폰트 설정 완료")
    print(f"[INFO] 현재 폰트: {rcParams['font.family']}")

# 모듈 import 시 자동으로 폰트 설정
if __name__ != "__main__":
    setup_korean_fonts()
