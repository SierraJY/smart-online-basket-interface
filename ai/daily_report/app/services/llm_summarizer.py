import os
from openai import OpenAI
from dotenv import load_dotenv

# .env 파일에서 OPENAI_API_KEY 로드
load_dotenv()


def summarize_with_llm(
    raw_text: str,
    model: str = "gpt-4.1-nano",
    system_message: str = "다음 분석 내용을 마케팅 보고서용으로 정리해줘.",
) -> str:
    """
    GMS(OpenAI SDK) 기반 LLM 요약 함수.
    .env에 GMS키(OPENAI_API_KEY) 보관, GMS OpenAI 엔드포인트로 호출.
    """
    try:
        # GMS 엔드포인트로 OpenAI 클라이언트 생성
        client = OpenAI(
            api_key=os.environ.get("OPENAI_API_KEY"),
            base_url="https://gms.ssafy.io/gmsapi/api.openai.com/v1",
        )
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": raw_text},
            ],
            temperature=0.6,
            max_tokens=600,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"LLM 요약 실패: {e}")
        return raw_text


# 예시 테스트 (단독 실행 시)
if __name__ == "__main__":
    sample = "이 상품은 지난주 대비 판매량이 급증하였고, 주말 동안 추가적으로 많은 고객이 구매하였습니다."
    result = summarize_with_llm(sample)
    print(result)
