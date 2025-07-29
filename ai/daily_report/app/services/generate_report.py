import os
from datetime import date
from jinja2 import Environment, FileSystemLoader
import weasyprint
import json

# 1. temp 디렉토리 생성 또는 비우기
TEMP_DIR = './temp'
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)

# 2. 각 모델 → 그래프 + 텍스트 저장 (생략 가능, 앞서 보여준 코드 사용)

# 3. HTML 템플릿 → PDF 생성
env = Environment(loader=FileSystemLoader('templates'))
template = env.get_template('daily_report.html')

with open(f'{TEMP_DIR}/summaries.json', 'r', encoding='utf-8') as f:
    summaries = json.load(f)

html = template.render(today=str(date.today()), summaries=summaries)
weasyprint.HTML(string=html, base_url=TEMP_DIR).write_pdf(f'{TEMP_DIR}/report.pdf')

# 4. 이메일로 전송 (생략 가능)

# 5. 전송 완료 후 cleanup (선택적)
import shutil
shutil.rmtree(TEMP_DIR)
