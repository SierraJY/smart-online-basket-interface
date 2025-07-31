import os
import openai

openai.api_key = os.environ.get("OPENAI_API_KEY")

def summarize_with_llm(raw_text: str, model="gpt-4o", system_message="다음 분석 내용을 마케팅 보고서용으로 정리해줘.") -> str:
    """
    입력된 분석 내용을 LLM을 통해 자연스러운 보고서용 문장으로 요약합니다.
    """
    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": raw_text}
            ],
            temperature=0.6,
            max_tokens=600
        )
        return response['choices'][0]['message']['content'].strip()
    except Exception as e:
        print(f"LLM 요약 실패: {e}")
        return raw_text
