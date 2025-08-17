import os
import re
import shutil
import logging
from datetime import date, timedelta, datetime
from typing import Dict, Tuple

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from sqlalchemy import create_engine

# 모델 import
from models.kmeans import generate_customer_cluster_summary
from models.prophet_runner import generate_forecast_summary
from models.lightgbm import generate_restock_summary
from models.fp_growth import generate_association_summary

from llm_summarizer import summarize_with_llm
import font_setup  # 한글 폰트 세팅

# ------------------------
# 로깅 설정
# ------------------------
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

# ------------------------
# PDF 엔진 관련
# ------------------------
def pick_pdf_engine() -> Tuple[str, str]:
    """PDF 엔진 자동 탐지"""
    wk = os.getenv("WKHTMLTOPDF_PATH") or shutil.which("wkhtmltopdf")
    we = os.getenv("WEASYPRINT_PATH") or shutil.which("weasyprint")

    if wk and os.path.exists(wk):
        return ("wkhtmltopdf", wk)
    if we and os.path.exists(we):
        return ("weasyprint", we)

    raise RuntimeError("PDF 엔진을 찾을 수 없습니다. (wkhtmltopdf / weasyprint)")


def log_safe_config():
    """환경 설정 로그 (민감정보 제외)"""
    try:
        engine_type, engine_path = pick_pdf_engine()
    except Exception:
        engine_type, engine_path = ("unknown", "not_found")
    show = {
        "TZ": os.getenv("TZ"),
        "PDF_ENGINE": f"{engine_type}: {engine_path}",
        "DB_URL": os.getenv("DB_URL", "not_set"),
    }
    logging.debug(f"Config: {show}")


# ------------------------
# HTML 템플릿 & Jinja 필터
# ------------------------
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

def paragraph_to_bullet_list(text: str) -> str:
    text = text.replace("\n", " ").strip()
    sentences = re.split(r"(?<=[.!?])\s+", text)
    li_tags = [f"<li>{s.strip()}</li>" for s in sentences if s.strip()]
    return f"<ul>{''.join(li_tags)}</ul>"

env.filters["bullet_list"] = paragraph_to_bullet_list
template = env.get_template("weekly_report.html")


# ------------------------
# 유틸 함수
# ------------------------
def get_last_week_range() -> str:
    today = datetime.today().date()
    end_date = today - timedelta(days=1)
    start_date = end_date - timedelta(days=6)
    return f"{start_date} ~ {end_date}"


def run_models(engine) -> Dict[str, Tuple[str, str]]:
    """모델 실행 후 (원문, 이미지) 반환"""
    results = {}
    results["customer"] = generate_customer_cluster_summary(engine)
    results["prophet"] = generate_forecast_summary(engine)
    results["restock"] = generate_restock_summary(engine)
    results["association"] = generate_association_summary(engine)
    return results


def summarize_results(raw: Dict[str, Tuple[str, str]]) -> Dict[str, str]:
    """LLM 요약 실행"""
    return {
        "customer": summarize_with_llm(raw["customer"][0], "고객 세분화 결과를 마케팅팀 보고서 스타일로 요약해줘."),
        "prophet": summarize_with_llm(raw["prophet"][0], "판매 예측 결과를 마케팅 전략 보고서 형식으로 요약해줘."),
        "restock": summarize_with_llm(raw["restock"][0], "재고 및 발주 예측 결과를 요약해줘. 강조점은 관리자에게 전달할 정보야."),
        "association": summarize_with_llm(raw["association"][0], "연관 규칙 분석 결과를 매대 구성 및 묶음 상품 추천 전략 중심으로 요약해줘."),
    }


def generate_pdf(html_out: str, out_dir: str) -> str:
    """HTML → PDF 변환 후 경로 반환"""
    engine_type, engine_path = pick_pdf_engine()

    if engine_type == "weasyprint":
        pdf_bytes = HTML(string=html_out, base_url="/app/output").write_pdf()
    else:
        raise NotImplementedError("wkhtmltopdf는 아직 구현되지 않았습니다")

    os.makedirs(out_dir, exist_ok=True)
    filename = f"weekly_report_{datetime.now():%Y%m%d_%H%M%S}.pdf"
    path = os.path.join(out_dir, filename)

    with open(path, "wb") as f:
        f.write(pdf_bytes)

    return path


# ------------------------
# 메인 함수
# ------------------------
def generate_report() -> str:
    """
    주간 리포트 PDF 파일 경로 반환. 실패 시 빈 문자열.
    """
    try:
        log_safe_config()

        DB_URL = os.getenv("DB_URL", "postgresql://mlapp:mlapp_pw@postgres:5432/mlapp")
        engine = create_engine(DB_URL)
        logging.info(f"DB 연결 성공: {DB_URL}")

        # 1. 모델 실행
        raw_results = run_models(engine)
        logging.info("모델 실행 완료")

        # 2. LLM 요약
        summaries = summarize_results(raw_results)
        logging.info("LLM 요약 완료")

        # 3. 템플릿 context
        context = {
            "week_range": get_last_week_range(),
            "today": date.today().isoformat(),
            "summaries": summaries,
            "images": {k: os.path.abspath(v[1]) for k, v in raw_results.items()},
        }

        html_out = template.render(**context)

        # 4. PDF 생성
        out_dir = os.getenv("REPORT_OUT_DIR", "/tmp/reports")
        pdf_path = generate_pdf(html_out, out_dir)

        logging.info(f"PDF 리포트 생성 완료: {pdf_path}")
        return pdf_path

    except Exception as e:
        logging.error(f"PDF 생성 실패: {e}", exc_info=True)
        return ""


if __name__ == "__main__":
    generate_report()
