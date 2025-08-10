import os
import smtplib
import ssl
from typing import Union, List, Optional
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.text import MIMEText


def send_email(
    pdf_bytes: bytes,
    receiver_email: Union[str, List[str]],
    subject: Optional[str] = None,
    body: Optional[str] = None,
    filename: str = "weekly_report.pdf",
    body_is_html: bool = False,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
) -> None:

    # SMTP & 계정 설정
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
    SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "true").lower() == "true"
    sender_email = os.getenv("SMTP_USERNAME")
    sender_password = os.getenv("SMTP_PASSWORD")

    if not sender_email:
        raise ValueError("발신자 이메일이 없습니다. REPORT_SENDER_EMAIL 또는 SMTP_USERNAME 환경변수를 설정하세요.")
    if sender_password is None:
        raise ValueError("발신자 비밀번호가 없습니다. REPORT_SENDER_PASSWORD 또는 SMTP_PASSWORD 환경변수를 설정하세요.")

    # 수신자/제목/본문 기본값
    if isinstance(receiver_email, str):
        to_list = [receiver_email]
    else:
        to_list = receiver_email

    subject = subject or "📊 스마트 바스켓 주간 리포트"
    body = body or "첨부된 PDF 리포트를 확인해주세요."
    cc = cc or []
    bcc = bcc or []

    # 메시지 구성
    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = ", ".join(to_list)
    if cc:
        msg["Cc"] = ", ".join(cc)
    msg["Subject"] = subject

    if body_is_html:
        msg.attach(MIMEText(body, "html", _charset="utf-8"))
    else:
        msg.attach(MIMEText(body, "plain", _charset="utf-8"))

    # PDF 첨부
    attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    attachment.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(attachment)

    # 실제 전송 대상 (To+Cc+Bcc)
    all_recipients = to_list + cc + bcc

    if SMTP_USE_SSL:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg, from_addr=sender_email, to_addrs=all_recipients)
    else:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.login(sender_email, sender_password)
            server.send_message(msg, from_addr=sender_email, to_addrs=all_recipients)

    print(f"[SUCCESS] 리포트 이메일 발송 완료 → {all_recipients}")
