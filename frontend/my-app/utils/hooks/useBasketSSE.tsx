import { useEffect, useRef, useState } from "react";

// 실시간 SSE (fetch+Authorization) 방식
export function useBasketSSE(boardMac: string | null, token: string | null) {
  const [basket, setBasket] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!boardMac || !token) return;

    abortControllerRef.current = new AbortController();

    async function connectSSE() {
      const response = await fetch(
        `http://localhost:8080/api/baskets/my/stream`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
          },
          signal: abortControllerRef.current?.signal,
        }
      );

      if (!response.body) {
        console.error("SSE 연결 실패: body 없음");
        return;
      }

      const reader = response.body.getReader();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += new TextDecoder().decode(value);

        // SSE 파싱 (data: ... 찾기)
        let lines = buf.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('data:')) {
            try {
              const data = JSON.parse(lines[i].replace(/^data:\s*/, ''));
              setBasket(data);
            } catch (e) { /* 무시 */ }
          }
        }
        // 마지막 줄이 data:로 안 끝나면 buffer에 남김
        buf = lines[lines.length - 1].includes('data:') ? '' : lines[lines.length - 1];
      }
    }

    connectSSE().catch(console.error);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [boardMac, token]);

  return basket;
}