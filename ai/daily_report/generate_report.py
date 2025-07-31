import os
from datetime import date, timedelta, datetime
from jinja2 import Environment, FileSystemLoader
import pdfkit

# 모델별 추론 및 이미지 생성 함수
from app.models.kmeans import generate_customer_cluster_summary
from app.models.prophet import generate_forecast_summary
from app.models.lightgbm import generate_restock_summary
from app.models.fp_growth import generate_association_summary

# LLM 정리 함수
from app.services.llm_summarizer import summarize_with_llm

# HTML 템플릿 렌더링용 설정
TEMPLATE_DIR = './templates'
OUTPUT_PDF_PATH = './output/daily_report.pdf'
WKHTMLTOPDF_PATH = '/usr/local/bin/wkhtmltopdf'

env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
template = env.get_template('daily_report.html')


def get_last_week_range():
    today = datetime.today().date()
    end_date = today - timedelta(days=1)
    start_date = end_date - timedelta(days=6)
    return f"{start_date} ~ {end_date}"


def generate_report():
    # 1. 각 모델 실행 → 이미지 저장 + 요약 텍스트 획득
    raw_customer, image_customer = generate_customer_cluster_summary()
    raw_prophet, image_prophet = generate_forecast_summary()
    raw_restock, image_restock = generate_restock_summary()
    raw_association, image_association = generate_association_summary()

    # 2. 각 요약 텍스트를 LLM에 넣어 문장 정제
    summary_customer = summarize_with_llm(raw_customer, system_message="고객 세분화 결과를 마케팅팀 보고서 스타일로 요약해줘.")
    summary_prophet = summarize_with_llm(raw_prophet, system_message="판매 예측 결과를 마케팅 전략 보고서 형식으로 요약해줘.")
    summary_restock = summarize_with_llm(raw_restock, system_message="재고 및 발주 예측 결과를 요약해줘. 강조점은 관리자에게 전달할 정보야.")
    summary_association = summarize_with_llm(raw_association, system_message="연관 규칙 분석 결과를 매대 구성 및 묶음 상품 추천 전략 중심으로 요약해줘.")

    # 3. 템플릿에 넣을 context 구성
    context = {
        'week_range': get_last_week_range(),
        'today': date.today().isoformat(),
        'summaries': {
            'customer': summary_customer,
            'prophet': summary_prophet,
            'restock': summary_restock,
            'association': summary_association,
        },
        'images': {
            'customer': image_customer,
            'prophet': image_prophet,
            'restock': image_restock,
            'association': image_association,
        }
    }

    # 4. HTML 렌더링 후 PDF 저장
    html_out = template.render(**context)
    config = pdfkit.configuration(wkhtmltopdf=WKHTMLTOPDF_PATH)
    os.makedirs(os.path.dirname(OUTPUT_PDF_PATH), exist_ok=True)
    pdfkit.from_string(html_out, OUTPUT_PDF_PATH, configuration=config)

    print(f"PDF 리포트 생성 완료: {OUTPUT_PDF_PATH}")


if __name__ == "__main__":
    generate_report()
