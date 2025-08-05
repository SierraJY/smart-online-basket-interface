import os
import re
from datetime import date, timedelta, datetime
from jinja2 import Environment, FileSystemLoader
import pdfkit

# 모델별 추론 및 이미지 생성 함수
from models.kmeans import generate_customer_cluster_summary
from models.prophet import generate_forecast_summary
from models.lightgbm import generate_restock_summary
from models.fp_growth import generate_association_summary

# LLM 요약 함수
from llm_summarizer import summarize_with_llm

# 템플릿 로딩 경로 (템플릿은 실제 파일로 존재해야 하므로 유지)
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
WKHTMLTOPDF_PATH = os.getenv("WKHTMLTOPDF_PATH", "/usr/bin/wkhtmltopdf")  # Linux default

env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

def paragraph_to_bullet_list(text: str) -> str:
    text = text.replace("\n", " ").strip()
    sentences = re.split(r"(?<=[.!?])\s+", text)
    li_tags = [f"<li>{s.strip()}</li>" for s in sentences if s.strip()]
    return f"<ul>\n{''.join(li_tags)}\n</ul>"

env.filters["bullet_list"] = paragraph_to_bullet_list
template = env.get_template("weekly_report.html")


def get_last_week_range():
    today = datetime.today().date()
    end_date = today - timedelta(days=1)
    start_date = end_date - timedelta(days=6)
    return f"{start_date} ~ {end_date}"


def generate_report() -> bytes:
    # 1. 모델 실행 → 원문 + 시각화 이미지
    raw_customer, image_customer = generate_customer_cluster_summary()
    raw_prophet, image_prophet = generate_forecast_summary()
    raw_restock, image_restock = generate_restock_summary()
    raw_association, image_association = generate_association_summary()

    # 2. LLM 요약
    summary_customer = summarize_with_llm(
        raw_customer,
        system_message="고객 세분화 결과를 마케팅팀 보고서 스타일로 요약해줘.",
    )
    summary_prophet = summarize_with_llm(
        raw_prophet,
        system_message="판매 예측 결과를 마케팅 전략 보고서 형식으로 요약해줘.",
    )
    summary_restock = summarize_with_llm(
        raw_restock,
        system_message="재고 및 발주 예측 결과를 요약해줘. 강조점은 관리자에게 전달할 정보야.",
    )
    summary_association = summarize_with_llm(
        raw_association,
        system_message="연관 규칙 분석 결과를 매대 구성 및 묶음 상품 추천 전략 중심으로 요약해줘.",
    )

    # 3. 템플릿 context
    context = {
        "week_range": get_last_week_range(),
        "today": date.today().isoformat(),
        "summaries": {
            "customer": summary_customer,
            "prophet": summary_prophet,
            "restock": summary_restock,
            "association": summary_association,
        },
        "images": {
            "customer": os.path.abspath(image_customer),
            "prophet": os.path.abspath(image_prophet),
            "restock": os.path.abspath(image_restock),
            "association": os.path.abspath(image_association),
        },
    }

    # 4. HTML 렌더링 및 PDF 바이트 생성
    html_out = template.render(**context)
    config = pdfkit.configuration(wkhtmltopdf=WKHTMLTOPDF_PATH)
    options = {"enable-local-file-access": ""}

    try:
        pdf_bytes = pdfkit.from_string(
            html_out, False, configuration=config, options=options
        )
        print("[SUCCESS] PDF 리포트 바이트 생성 완료")
        return pdf_bytes
    except Exception as e:
        print("[ERROR] PDF 생성 중 예외 발생!")
        print(e)
        raise
