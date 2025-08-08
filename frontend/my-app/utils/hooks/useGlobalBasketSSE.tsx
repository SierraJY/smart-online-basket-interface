'use client'

import { useEffect, useRef, useState } from "react";
import { useBasketStore } from "@/store/useBasketStore";
import { useAuth } from "@/utils/hooks/useAuth";
import { authStorage } from "@/utils/storage";
import { config } from "@/config/env";
import ToastManager from '@/utils/toastManager';
// @ts-ignore
import { NativeEventSource, EventSourcePolyfill } from 'event-source-polyfill';

// EventSource polyfill 설정
const EventSource = NativeEventSource || EventSourcePolyfill;

// 전역 변수들
let globalEventSource: EventSource | null = null;
let globalBasketData: any = null;
let globalListeners = new Set<((data: any) => void)>();
let isConnecting = false;
let connectionCheckInterval: NodeJS.Timeout | null = null;

// 연결 상태 체크 함수
function startConnectionCheck() {
  // 기존 체크 인터벌 정리
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  
  // 15초마다 연결 상태 체크
  connectionCheckInterval = setInterval(() => {
    const readyState = globalEventSource?.readyState;
    const stateText = readyState === 0 ? 'CONNECTING' : 
                     readyState === 1 ? 'OPEN' : 
                     readyState === 2 ? 'CLOSED' : 'UNKNOWN';
    
    console.log(`[Global SSE] 연결 상태 체크 - 상태: ${stateText}, 연결중: ${isConnecting}, 리스너 수: ${globalListeners.size}`);
    
    // 연결이 끊어진 경우 재연결 시도
    if (readyState === 2 && !isConnecting) {
      console.log('[Global SSE] 연결이 끊어짐 감지 - 재연결 시도');
      reconnectGlobalSSE();
    }
  }, 15000); // 15초마다 체크
}

function stopConnectionCheck() {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
}

// SSE 연결 함수
async function connectGlobalSSE(basketId: string | null, token: string | null) {
  // 이미 연결 중이거나 유효한 연결이 있으면 중복 연결 방지
  if (isConnecting || (globalEventSource && globalEventSource.readyState === EventSource.OPEN)) {
    console.log('[Global SSE] 이미 연결 중이거나 연결됨 - 중복 연결 방지');
    return;
  }

  if (!basketId || !token) {
    console.log('[Global SSE] 연결 조건 불충족 - basketId:', basketId, 'hasToken:', !!token);
    return;
  }

  // 기존 연결 정리
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }

  isConnecting = true;
  console.log('[Global SSE] 연결 시도 - basketId:', basketId);

  try {
    const url = `${config.API_BASE_URL}/api/baskets/my/stream`;
    
    // EventSourcePolyfill 사용
    globalEventSource = new EventSourcePolyfill(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/event-stream',
        },
        heartbeatTimeout: 1800000, // 30분 heartbeat 타임아웃 (백엔드 30분과 동일)
        connectionTimeout: 60000, // 1분 연결 타임아웃
        retryInterval: 5000, // 재연결 간격 5초
        maxRetries: 50, // 최대 재연결 시도 횟수
        withCredentials: false,
      });

    // EventSource 이벤트 리스너 설정
    if (globalEventSource) {
      globalEventSource.onopen = () => {
        console.log("[Global SSE] SSE 연결 성공");
        isConnecting = false;
        
        // 15초마다 연결 상태 체크 시작
        startConnectionCheck();
      };

      // 바구니 데이터 처리 함수
      const handleBasketData = (data: any) => {
         console.log("[Global SSE] 데이터 수신됨:", data?.items?.length || 0, "개 상품");
         
         // 데이터 유효성 검증 (간단하게)
         if (!data || !Array.isArray(data.items)) {
           console.warn("[Global SSE] 유효하지 않은 데이터 구조:", data);
           return;
         }
         
         // 상품 추가 감지 및 toast 알림
         if (data && data.items && globalBasketData && globalBasketData.items) {
           const previousItems = globalBasketData.items;
           const currentItems = data.items;
           
           // 새로 추가된 상품 찾기
           const addedItems = currentItems.filter((currentItem: any) => 
             !previousItems.some((prevItem: any) => 
               prevItem.epcPattern === currentItem.epcPattern
             )
           );
           
           // 상품이 추가된 경우에만 toast 표시
           if (addedItems.length > 0) {
             const addedItem = addedItems[0];
             const productName = addedItem?.product?.name || '상품';
             const productImageUrl = addedItem?.product?.imageUrl;
             
             console.log("[Global SSE] 상품 추가 감지:", productName);
             ToastManager.basketAdded(productName, productImageUrl);
           }
         } else if (data && data.items && data.items.length > 0 && (!globalBasketData || !globalBasketData.items)) {
           // 첫 번째 데이터 수신 시에도 상품 추가 알림
           const firstItem = data.items[0];
           const productName = firstItem?.product?.name || '상품';
           const productImageUrl = firstItem?.product?.imageUrl;
           
           console.log("[Global SSE] 초기 상품 감지:", productName);
           ToastManager.basketAdded(productName, productImageUrl);
         }
         
         globalBasketData = data;

         // 모든 리스너에게 데이터 전달
         for (const listener of globalListeners) {
           if (listener) listener(data);
         }

         // store에도 저장
         try {
            const store = useBasketStore.getState();
            if (store.setBasketData) {
              store.setBasketData(data);
              console.log("[Global SSE] Store에 데이터 저장:", data?.items?.length || 0, "개 상품");
            }
          } catch (error) {
            console.error("[Global SSE] Store 데이터 저장 실패:", error);
          }

         // 서비스 워커에 데이터 전송
         if (typeof window !== 'undefined' && (window as any).sendBasketUpdateToSW) {
           (window as any).sendBasketUpdateToSW(data);
         }
       };

      // 이벤트 리스너 설정
      globalEventSource.addEventListener('basket-initial', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          handleBasketData(data);
        } catch (e) {
          console.error("[Global SSE] basket-initial 데이터 파싱 실패:", e);
        }
      });

      globalEventSource.addEventListener('basket-update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          handleBasketData(data);
        } catch (e) {
          console.error("[Global SSE] basket-update 데이터 파싱 실패:", e);
        }
      });

      globalEventSource.onerror = (error: Event) => {
        console.log("[Global SSE] 연결 에러 - 자동 재연결 대기", error);
        
        // 에러 타입별 처리
        if (error instanceof Event) {
          const target = error.target as EventSource;
          if (target && target.readyState === EventSource.CLOSED) {
            console.log("[Global SSE] 연결이 정상적으로 종료됨");
          } else {
            console.log("[Global SSE] 네트워크 에러 발생");
          }
        }
        
        if (globalEventSource) {
          globalEventSource.close();
          globalEventSource = null;
        }
        
        isConnecting = false;
        stopConnectionCheck(); // 연결 체크 중지
        
        // 3초 후 자동 재연결 시도
        setTimeout(() => {
          if (!isConnecting) {
            console.log("[Global SSE] 자동 재연결 시도");
            reconnectGlobalSSE();
          }
        }, 3000);
      };
    }

  } catch (e: any) {
    console.warn("[Global SSE] EventSource 생성 실패:", e.message || e);
    isConnecting = false;
  }
}

// 전역 SSE 훅
export function useGlobalBasketSSE() {
  const { accessToken: token } = useAuth();
  const basketId = useBasketStore((s: any) => s.basketId);
  const setBasketData = useBasketStore((s: any) => s.setBasketData);

  const [basket, setBasket] = useState<any>(null);
  const listenerRef = useRef<((data: any) => void) | null>(null);

  // SSE 연결 관리
  useEffect(() => {
    if (!token || !basketId) {
      console.log('[Global SSE] 연결 조건 불충족 - token:', !!token, 'basketId:', basketId);
      return;
    }

    console.log('[Global SSE] 연결 조건 충족 - SSE 연결 시작');
    
    // 연결 지연 (Store hydration 완료 대기)
    const connectionTimer = setTimeout(() => {
      connectGlobalSSE(basketId, token).catch(error => {
        console.error('[Global SSE] 연결 실패:', error);
      });
    }, 500);
    
    // cleanup
    return () => {
      clearTimeout(connectionTimer);
      console.log('[Global SSE] cleanup - 연결 해제');
      disconnectGlobalSSE();
    };
  }, [token, basketId]);

  // 리스너 등록
  useEffect(() => {
    listenerRef.current = (data: any) => {
      setBasket(data);
      setBasketData(data);
    };
    globalListeners.add(listenerRef.current);

    // 기존 데이터가 있으면 즉시 설정
    if (globalBasketData) {
      setBasket(globalBasketData);
      setBasketData(globalBasketData);
    }

    return () => {
      if (listenerRef.current) {
        globalListeners.delete(listenerRef.current);
      }
    };
  }, [setBasketData]);

  // 전역 재연결 함수 노출
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).reconnectSSE = () => {
        console.log('[Global SSE] 전역 재연결 함수 호출');
        reconnectGlobalSSE();
      };
    }
  }, []);

  return basket;
}

// 전역 SSE 연결 해제 함수
export function disconnectGlobalSSE() {
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
  globalBasketData = null;
  globalListeners.clear();
  isConnecting = false;
  stopConnectionCheck(); // 연결 체크 중지
}

// 수동 재연결 함수
export function reconnectGlobalSSE() {
  console.log('[Global SSE] 수동 재연결 요청');
  
  // 기존 연결 정리
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
  
  isConnecting = false;
  
  // 현재 상태에서 재연결
  try {
    const store = useBasketStore.getState();
    const basketId = store?.basketId || null;
    const token = authStorage.getAccessToken();
    
    console.log('[Global SSE] 재연결 시도 - basketId:', basketId, 'hasToken:', !!token);
    
    if (basketId && token) {
      setTimeout(() => {
        connectGlobalSSE(basketId, token);
      }, 1000);
    } else {
      console.warn('[Global SSE] 재연결 조건 불충족');
    }
  } catch (error) {
    console.error('[Global SSE] 재연결 실패:', error);
  }
} 