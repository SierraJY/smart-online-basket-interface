import { useEffect, useRef, useState } from "react";
import { useBasketStore } from "@/store/useBasketStore";
import { useAuth } from "@/utils/hooks/useAuth";
import { authStorage } from "@/utils/storage";
import { config } from "@/config/env";

// 전역 SSE 연결 관리
let globalSSERef: AbortController | null = null;
let globalBasketData: any = null;
let globalListeners: Set<(data: any) => void> = new Set();
let globalStore: any = null; // store 참조 저장
let globalEventSource: EventSource | null = null;
let globalConnectionMonitor: NodeJS.Timeout | null = null; // 연결 모니터링 전역 변수
let globalReconnectAttempts: number = 0; // 재연결 시도 횟수
let globalMaxReconnectAttempts: number = 10; // 최대 재연결 시도 횟수
let globalReconnectDelay: number = 1000; // 재연결 지연 시간 (ms)

// 전역 SSE 연결 함수
function connectGlobalSSE(basketId: string | null, token: string | null) {
  console.log("[Global SSE] 연결 시도 - basketId:", basketId, "hasToken:", !!token);
  
  // 기존 연결 정리
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
  
  if (globalSSERef) {
    globalSSERef.abort();
    globalSSERef = null;
  }

  // 기존 connectionMonitor 정리
  if (globalConnectionMonitor) {
    clearInterval(globalConnectionMonitor);
    globalConnectionMonitor = null;
  }

  if (!basketId || !token) {
    console.log("[Global SSE] 연결 조건 불충분 - basketId:", basketId, "hasToken:", !!token);
    globalBasketData = null;
    globalListeners.forEach(listener => listener(null));
    return;
  }

  // 활성화 상태 확인 (store에서 가져오기)
  const activatedBasketId = globalStore?.getState()?.activatedBasketId || null;
  const needsActivation = basketId && (activatedBasketId !== basketId);
  
  console.log("[Global SSE] 활성화 상태 확인 - basketId:", basketId, "activatedBasketId:", activatedBasketId, "needsActivation:", needsActivation);
  
  if (needsActivation) {
    console.log("[Global SSE] 활성화 필요 - basketId:", basketId, "activatedBasketId:", activatedBasketId);
    globalBasketData = null;
    globalListeners.forEach(listener => listener(null));
    return;
  }

  globalSSERef = new AbortController();

  async function connectSSE() {
    try {
      console.log("[Global SSE] 연결 시도! basketId:", basketId, "token:", token);

      // 임시로 fetch 방식 사용 (백엔드에서 쿼리 파라미터 처리 구현 후 EventSource로 변경)
      const response = await fetch(config.API_ENDPOINTS.BASKET_STREAM, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: globalSSERef?.signal,
      });

      if (!response.ok) {
        console.error("[Global SSE] 연결 실패: HTTP", response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        console.error("[Global SSE] 연결 실패: response.body 없음");
        throw new Error("Response body is null");
      }

      console.log("[Global SSE] 연결 성공! 스트림 읽기 시작...");
      globalReconnectAttempts = 0; // 연결 성공 시 재연결 시도 횟수 리셋

      const reader = response.body.getReader();
      let buf = "";
      let lastDataTime = Date.now();
      
      // 연결 상태 모니터링 (디버깅용) - 전역 변수로 관리
      globalConnectionMonitor = setInterval(() => {
        const now = Date.now();
        const timeSinceLastData = now - lastDataTime;
        const secondsSinceLastData = Math.round(timeSinceLastData / 1000);
        console.log(`[Global SSE] 연결 상태 - 마지막 데이터 수신 후 ${secondsSinceLastData}초 경과`);
        
        // 30초간 데이터가 없으면 재연결 시도
        if (timeSinceLastData > 30000) {
          console.log("[Global SSE] 30초간 데이터 없음 - 재연결 시도");
          if (globalConnectionMonitor !== null) {
            clearInterval(globalConnectionMonitor);
            globalConnectionMonitor = null;
          }
          if (globalSSERef) {
            globalSSERef.abort();
          }
          // 재연결 시도
          setTimeout(() => {
            if (globalReconnectAttempts < globalMaxReconnectAttempts) {
              globalReconnectAttempts++;
              console.log(`[Global SSE] 재연결 시도 ${globalReconnectAttempts}/${globalMaxReconnectAttempts}`);
              connectGlobalSSE(basketId, token);
            } else {
              console.error("[Global SSE] 최대 재연결 시도 횟수 초과");
            }
          }, globalReconnectDelay * globalReconnectAttempts); // 지수 백오프
        }
      }, 10000); // 10초마다 체크

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[Global SSE] 연결 종료 (done==true)");
          if (globalConnectionMonitor) {
            clearInterval(globalConnectionMonitor);
            globalConnectionMonitor = null;
          }
          break;
        }

        const chunk = new TextDecoder().decode(value);
        console.log("[Global SSE] 청크 수신:", chunk.length, "bytes");
        buf += chunk;

        // SSE 파싱
        let lines = buf.split("\n");
        console.log("[Global SSE] 버퍼 라인 수:", lines.length, "전체 버퍼:", JSON.stringify(buf));
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          console.log("[Global SSE] 라인", i, ":", line);
          
          if (line.startsWith("data:")) {
            const jsonString = line.replace(/^data:\s*/, "");
            console.log("[Global SSE] JSON 문자열:", jsonString);
            
            if (jsonString.trim() === "") {
              console.log("[Global SSE] 빈 데이터 건너뛰기");
              continue;
            }

            try {
              const data = JSON.parse(jsonString);
              globalBasketData = data;
              lastDataTime = Date.now(); // 데이터 수신 시간 업데이트
              console.log("[Global SSE] 새 데이터 수신!", data, "items:", data.items, "count:", data.items?.length);

              // 모든 리스너에게 데이터 전달
              for (const listener of globalListeners) {
                if (listener) listener(data);
              }

              // store에도 저장
              if (globalStore?.setBasketData) {
                globalStore.setBasketData(data);
              }

              // 서비스 워커에 데이터 전송
              if (typeof window !== 'undefined' && (window as any).sendBasketUpdateToSW) {
                (window as any).sendBasketUpdateToSW(data);
              }
            } catch (e) {
              console.error("[Global SSE] JSON 파싱 실패! 원본:", jsonString, "에러:", e);
            }
          }
        }
        
        // 버퍼 관리: 완전한 라인이 아닌 경우 남겨둠
        const lastLine = lines[lines.length - 1];
        console.log("[Global SSE] 마지막 라인:", lastLine, "길이:", lastLine.length);
        
        if (lastLine.includes("data:") && !lastLine.endsWith("\n")) {
          buf = lastLine;
          console.log("[Global SSE] 버퍼 유지:", buf);
        } else {
          buf = "";
          console.log("[Global SSE] 버퍼 초기화");
        }
      }

    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("[Global SSE] 연결 종료(Abort)", e);
      } else {
        console.error("[Global SSE] 연결 에러!", e);
        
        // 에러 발생 시 재연결 시도
        if (globalReconnectAttempts < globalMaxReconnectAttempts) {
          globalReconnectAttempts++;
          console.log(`[Global SSE] 에러로 인한 재연결 시도 ${globalReconnectAttempts}/${globalMaxReconnectAttempts}`);
          setTimeout(() => {
            connectGlobalSSE(basketId, token);
          }, globalReconnectDelay * globalReconnectAttempts); // 지수 백오프
        } else {
          console.error("[Global SSE] 최대 재연결 시도 횟수 초과");
        }
      }
      
      // 에러 발생 시에도 connectionMonitor 정리
      if (globalConnectionMonitor !== null) {
        clearInterval(globalConnectionMonitor);
        globalConnectionMonitor = null;
      }
    }
  }

  connectSSE();
}

// 전역 SSE 훅
export function useGlobalBasketSSE() {
  const { accessToken: token } = useAuth();
  const basketId = useBasketStore(s => s.basketId);
  const setBasketData = useBasketStore(s => s.setBasketData);
  const basketData = useBasketStore(s => s.basketData);
  const [basket, setBasket] = useState<any>(globalBasketData || basketData);
  // useRef에 초기값 null을 명시
  const listenerRef = useRef<((data: any) => void) | null>(null);
  
  // 활성화 완료 상태 감지 (페이지 새로고침 시에도 작동)
  const [activationTrigger, setActivationTrigger] = useState(0);

  useEffect(() => {
    // store 참조 저장
    globalStore = useBasketStore;
    
    // 리스너 등록
    listenerRef.current = (data: any) => {
      setBasket(data);
      setBasketData(data); // store에도 저장
    };
    globalListeners.add(listenerRef.current);

    // 기존 데이터가 있으면 즉시 설정
    if (globalBasketData) {
      setBasket(globalBasketData);
      setBasketData(globalBasketData);
    }

    // 전역 SSE 연결 시작
    connectGlobalSSE(basketId, token);

    return () => {
      // 리스너 제거
      if (listenerRef.current) {
        globalListeners.delete(listenerRef.current);
      }
    };
  }, [basketId, token, setBasketData, activationTrigger]);

  // 활성화 완료 후 SSE 재연결을 위한 전역 함수 노출
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).triggerSSEReconnect = () => {
        console.log('[Global SSE] 재연결 트리거됨');
        setActivationTrigger(prev => prev + 1);
      };
    }
  }, []);

  return basket;
}

// 전역 SSE 연결 해제 함수 (필요시 사용)
export function disconnectGlobalSSE() {
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
  if (globalSSERef) {
    globalSSERef.abort();
    globalSSERef = null;
  }
  if (globalConnectionMonitor !== null) {
    clearInterval(globalConnectionMonitor);
    globalConnectionMonitor = null;
  }
  globalBasketData = null;
  globalListeners.clear();
  globalReconnectAttempts = 0; // 재연결 시도 횟수 리셋
}

// 수동 재연결 함수
export function reconnectGlobalSSE() {
  console.log('[Global SSE] 수동 재연결 시도');
  globalReconnectAttempts = 0; // 재연결 시도 횟수 리셋
  
  // 현재 store 상태에서 basketId 가져오기
  const currentState = globalStore?.getState();
  const basketId = currentState?.basketId;
  
  // authStorage에서 token 가져오기 (useAuth와 동일한 방식)
  const token = authStorage.getAccessToken();
  
  if (basketId && token) {
    connectGlobalSSE(basketId, token);
  } else {
    console.error('[Global SSE] 재연결 실패: basketId 또는 token이 없습니다', {
      basketId,
      hasToken: !!token
    });
  }
} 