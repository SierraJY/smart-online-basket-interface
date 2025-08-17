import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.text import MIMEText

def send_email(pdf_path: str, receiver_email: str):
    sender_email = os.getenv("REPORT_SENDER_EMAIL")
    sender_password = os.getenv("REPORT_SENDER_PASSWORD")

    subject = "📊 스마트 바스켓 주간 리포트"
    body = "첨부된 PDF 리포트를 확인해주세요."

    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = receiver_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    # PDF 파일을 바이트로 읽어서 첨부
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
    attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    attachment.add_header("Content-Disposition", "attachment", filename="weekly_report.pdf")
    msg.attach(attachment)

    # SMTP 연결 및 전송
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, sender_password)
        server.send_message(msg)

    print(f"[SUCCESS] {receiver_email}에게 리포트 이메일 발송 완료")
