import os
from datetime import date, timedelta, datetime
from jinja2 import Environment, FileSystemLoader
import pdfkit
import re

# from app.models.kmeans import generate_customer_cluster_summary
from app.models.prophet import generate_forecast_summary

# from app.models.lightgbm import generate_restock_summary
# from app.models.fp_growth import generate_association_summary
from app.services.llm_summarizer import summarize_with_llm

TEMPLATE_DIR = "./templates"
OUTPUT_PDF_PATH = "./output/daily_report.pdf"
WKHTMLTOPDF_PATH = r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe"

env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
template = env.get_template("daily_report.html")


def get_last_week_range():
    today = datetime.today().date()
    end_date = today - timedelta(days=1)
    start_date = end_date - timedelta(days=6)
    return f"{start_date} ~ {end_date}"


def debug_resource_links(html_out):
    urls = re.findall(r'(src|href)="([^"]+)"', html_out)
    print(f"\n[디버그] HTML 내 리소스 {len(urls)}개:")
    for attr, link in urls:
        if (
            link.startswith("data:")
            or link.startswith("blob:")
            or link.startswith("chrome-extension:")
            or (
                not (
                    link.startswith("http")
                    or link.startswith("file")
                    or link.startswith("/")
                    or link.startswith(".")
                )
            )
        ):
            print(f"  - [{attr}] 위험/비표준: {link}")
        else:
            print(f"  - [{attr}] 정상: {link}")


def generate_report():
    # 1. 각 모델 실행 → 이미지 저장 + 요약 텍스트 획득
    # raw_customer, image_customer = generate_customer_cluster_summary()
    raw_prophet, image_prophet = generate_forecast_summary()
    # raw_restock, image_restock = generate_restock_summary()
    # raw_association, image_association = generate_association_summary()

    summary_prophet = summarize_with_llm(
        raw_prophet,
        system_message="판매 예측 결과를 마케팅 전략 보고서 형식으로 요약해줘.",
    )

    context = {
        "week_range": get_last_week_range(),
        "today": date.today().isoformat(),
        "summaries": {
            # 'customer': summary_customer,
            "prophet": summary_prophet,
            # 'restock': summary_restock,
            # 'association': summary_association,
        },
        "images": {
            # 'customer': image_customer,
            "prophet": image_prophet,  # **여기에 절대경로가 들어감**
            # 'restock': image_restock,
            # 'association': image_association,
        },
    }

    print(f"[진단] image_prophet 값: {image_prophet}")
    print(
        f"[진단] 이미지 실제 존재? {os.path.exists(image_prophet)} (절대경로: {image_prophet})"
    )

    html_out = template.render(**context)
    debug_resource_links(html_out)
    print("\n===== 렌더된 HTML 일부 =====")
    print(html_out[:500])
    print("... (생략) ...")
    print("===========================")

    config = pdfkit.configuration(wkhtmltopdf=WKHTMLTOPDF_PATH)
    os.makedirs(os.path.dirname(OUTPUT_PDF_PATH), exist_ok=True)
    options = {"enable-local-file-access": ""}

    try:
        print(f"[INFO] PDF 변환 시작: {OUTPUT_PDF_PATH}")
        pdfkit.from_string(
            html_out, OUTPUT_PDF_PATH, configuration=config, options=options
        )
        print(f"[SUCCESS] PDF 리포트 생성 완료: {OUTPUT_PDF_PATH}")
    except Exception as e:
        print("[ERROR] PDF 생성 중 예외 발생!")
        print(e)
        if hasattr(e, "args") and e.args:
            print(f"[ERROR 상세] {e.args[0]}")
        print("문제 발생 시, 위 WARNING/비표준 링크와 wkhtmltopdf 로그를 참고하세요.")
        raise


if __name__ == "__main__":
    generate_report()
