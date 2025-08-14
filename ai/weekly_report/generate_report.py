import os
import re
from datetime import date, timedelta, datetime
from jinja2 import Environment, FileSystemLoader
import pdfkit
from llm_summarizer import summarize_with_llm

# 템플릿 로딩 경로
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
WKHTMLTOPDF_PATH = os.getenv("WKHTMLTOPDF_PATH", "/usr/bin/wkhtmltopdf")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")

# Jinja2 환경 설정
env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

def paragraph_to_bullet_list(text: str) -> str:
    text = text.replace("\n", " ").strip()
    sentences = re.split(r"(?<=[.!?])\s+", text)
    li_tags = [f"<li>{s.strip()}</li>" for s in sentences if s.strip()]
    return f"<ul>\n{''.join(li_tags)}\n</ul>"

env.filters["bullet_list"] = paragraph_to_bullet_list
template = env.get_template("weekly_report.html")

def load_model_results(model_name: str) -> tuple[str, str]:
    """각 모델의 결과 파일을 로드"""
    try:
        result_file = os.path.join(OUTPUT_DIR, f"{model_name}_result.txt")
        image_file = os.path.join(OUTPUT_DIR, f"{model_name}_plot.png")
        
        with open(result_file, "r", encoding="utf-8") as f:
            raw_text = f.read()
            
        if not os.path.exists(image_file):
            raise FileNotFoundError(f"이미지 파일이 없습니다: {image_file}")
            
        return raw_text, image_file
    except Exception as e:
        print(f"[WARNING] {model_name} 결과 로딩 실패: {e}")
        return f"[오류] {model_name} 분석 결과를 불러올 수 없습니다.", None

def generate_report(start_date: date, end_date: date) -> bytes:
    try:
        # 1. 각 모델의 결과 파일 읽기
        model_names = ["customer", "prophet", "restock", "association"]
        model_results = {
            name: {"raw_text": text, "image_path": img_path}
            for name in model_names
            for text, img_path in [load_model_results(name)]
        }

        # 2. LLM 요약
        system_messages = {
            "customer": "고객 세분화 결과를 마케팅팀 보고서 스타일로 요약해줘.",
            "prophet": "판매 예측 결과를 마케팅 전략 보고서 형식으로 요약해줘.",
            "restock": "재고 및 발주 예측 결과를 요약해줘. 강조점은 관리자에게 전달할 정보야.",
            "association": "연관 규칙 분석 결과를 매대 구성 및 묶음 상품 추천 전략 중심으로 요약해줘."
        }

        summaries = {}
        for model_name, message in system_messages.items():
            raw_text = model_results[model_name]["raw_text"]
            try:
                if not raw_text.startswith("[오류]"):
                    summaries[model_name] = summarize_with_llm(raw_text, system_message=message)
                else:
                    summaries[model_name] = raw_text
            except Exception as e:
                print(f"[WARNING] {model_name} 요약 실패: {e}")
                summaries[model_name] = raw_text

        # 3. 템플릿 context
        context = {
            "week_range": f"{start_date} ~ {end_date}",
            "today": date.today().isoformat(),
            "summaries": summaries,
            "images": {
                name: results["image_path"]
                for name, results in model_results.items()
                if results["image_path"]
            }
        }

        # 4. HTML 렌더링 및 PDF 바이트 생성
        html_out = template.render(**context)
        config = pdfkit.configuration(wkhtmltopdf=WKHTMLTOPDF_PATH)
        options = {
            "enable-local-file-access": "",
            "encoding": "UTF-8",
            "disable-smart-substitutions": "",
            "disable-smart-quotes": ""
        }

        pdf_bytes = pdfkit.from_string(
            html_out, False, configuration=config, options=options
        )
        
        # PDF 파일로 저장 (이메일 전송용)
        pdf_path = os.path.join(OUTPUT_DIR, "weekly_report.pdf")
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)
            
        print("[SUCCESS] PDF 리포트 생성 완료")
        return pdf_bytes

    except Exception as e:
        print(f"[ERROR] PDF 생성 중 예외 발생: {e}")
        raise