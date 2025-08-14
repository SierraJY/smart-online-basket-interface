import os
from openai import OpenAI
from typing import Optional

def summarize_with_llm(
    raw_text: str,
    system_message: str = "다음 분석 내용을 마케팅 보고서용으로 정리해줘.",
    model: Optional[str] = None,
) -> str:
    """
    GMS(OpenAI SDK) 기반 LLM 요약 함수.
    Docker 환경변수에서 설정값을 가져옴.

    Args:
        raw_text (str): 요약할 원문 텍스트
        system_message (str): LLM에게 전달할 시스템 메시지
        model (Optional[str]): 사용할 모델명. 없으면 환경변수에서 가져옴

    Returns:
        str: 요약된 텍스트 또는 에러 메시지
    """
    try:
        # 환경 변수에서 설정 가져오기
        api_key = os.environ.get("OPENAI_API_KEY")
        base_url = os.environ.get("GMS_BASE_URL", "https://gms.ssafy.io/gmsapi/api.openai.com/v1")
        default_model = os.environ.get("GMS_MODEL", "gpt-4.1-nano")

        if not api_key:
            raise ValueError("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")

        # GMS 엔드포인트로 OpenAI 클라이언트 생성
        client = OpenAI(
            api_key=api_key,
            base_url=base_url,
        )

        response = client.chat.completions.create(
            model=model or default_model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": raw_text},
            ],
            temperature=0.6,
            max_tokens=600,
        )
        
        summary = response.choices[0].message.content.strip()
        if not summary:
            raise ValueError("LLM이 빈 응답을 반환했습니다.")
            
        return summary

    except ValueError as ve:
        error_msg = f"[설정 오류] {str(ve)}"
        print(error_msg)
        return error_msg
    except Exception as e:
        error_msg = f"[LLM 요약 실패] {str(e)}"
        print(error_msg)
        return raw_text
