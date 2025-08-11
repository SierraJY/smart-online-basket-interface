'use client'

import { useEffect, useRef, useState } from "react";
import { useBasketStore } from "@/store/useBasketStore";
import { useAuth } from "@/utils/hooks/useAuth";
import { authStorage } from "@/utils/storage";
import { config } from "@/config/env";
import ToastManager from '@/utils/toastManager';
import type { Basket, BasketItem, BasketData } from "@/types";
import { NativeEventSource, EventSourcePolyfill } from 'event-source-polyfill';

// EventSource polyfill 설정
const EventSource = NativeEventSource || EventSourcePolyfill;

// EventSource 확장 타입 (연결 시작 시간 저장용)
interface ExtendedEventSource extends EventSource {
  _connectionStartTime?: number;
}

// SSE 연결 상태 타입
export type SSEConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

// 에러 정보 타입
export interface SSEErrorInfo {
  type: 'network' | 'auth' | 'timeout' | 'server' | 'unknown';
  message: string;
  timestamp: number;
  retryAttempt: number;
}

// 전역 변수들 - 타입 안전성 확보
let globalEventSource: ExtendedEventSource | null = null;
let globalBasketData: Basket | null = null;
const globalListeners = new Set<((data: Basket) => void)>();
const globalStatusListeners = new Set<((status: SSEConnectionStatus) => void)>();
const globalErrorListeners = new Set<((error: SSEErrorInfo) => void)>();
let isConnecting = false;
let connectionCheckInterval: ReturnType<typeof setInterval> | null = null;
let retryAttempt = 0; // 지수 백오프 재시도 횟수
let currentStatus: SSEConnectionStatus = 'disconnected';
let lastError: SSEErrorInfo | null = null;

// 상태 업데이트 함수
function updateConnectionStatus(status: SSEConnectionStatus): void {
  if (currentStatus === status) return;
  
  currentStatus = status;
  console.log(`[Global SSE] 연결 상태 변경: ${status}`);
  
  // 모든 상태 리스너에게 알림
  for (const listener of globalStatusListeners) {
    if (listener) listener(status);
  }
}

// 에러 정보 업데이트 함수
function updateErrorInfo(errorInfo: SSEErrorInfo): void {
  lastError = errorInfo;
  console.error(`[Global SSE] 에러 발생:`, errorInfo);
  
  // 모든 에러 리스너에게 알림
  for (const listener of globalErrorListeners) {
    if (listener) listener(errorInfo);
  }
}

// 에러 타입 분류 함수
function classifyError(error: Event | Error | unknown): SSEErrorInfo {
  const timestamp = Date.now();
  
  // EventSource 에러 분석
  if (error instanceof Event) {
    const target = error.target as EventSource;
    if (target) {
      const readyState = target.readyState;
      
      if (readyState === EventSource.CLOSED) {
        return {
          type: 'server',
          message: '서버에서 연결을 종료했습니다.',
          timestamp,
          retryAttempt
        };
      }
    }
    
    return {
      type: 'network',
      message: '네트워크 연결 문제가 발생했습니다.',
      timestamp,
      retryAttempt
    };
  }
  
  // 일반 에러 분석
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return {
        type: 'auth',
        message: '인증이 필요합니다. 다시 로그인해주세요.',
        timestamp,
        retryAttempt
      };
    }
    
    if (message.includes('timeout') || message.includes('연결 타임아웃')) {
      return {
        type: 'timeout',
        message: '연결 시간이 초과되었습니다.',
        timestamp,
        retryAttempt
      };
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        type: 'network',
        message: '네트워크 연결을 확인해주세요.',
        timestamp,
        retryAttempt
      };
    }
    
    return {
      type: 'server',
      message: `서버 오류: ${error.message}`,
      timestamp,
      retryAttempt
    };
  }
  
  return {
    type: 'unknown',
    message: '알 수 없는 오류가 발생했습니다.',
    timestamp,
    retryAttempt
  };
}

// 전역 재연결 함수를 즉시 노출 (훅 실행 전에도 사용 가능)
if (typeof window !== 'undefined') {
  (window as any).reconnectSSE = () => {
    console.log('[Global SSE] 전역 재연결 함수 호출 (즉시 노출)');
    reconnectGlobalSSE();
  };
}

// 백엔드 준비 상태 확인 함수 (CORS 이슈로 인해 단순화)
async function verifyBackendReadiness(_basketId: string, _token: string): Promise<boolean> {
  // CORS 정책으로 인해 HEAD 요청 대신 단순 지연으로 백엔드 준비 시간 확보
  console.log('[Global SSE] 백엔드 준비 시간 확보 (500ms)');
  await new Promise(resolve => setTimeout(resolve, 500));
  return true;
}

// SSE 연결 테스트 함수
function testSSEConnection(): void {
  console.log('[Global SSE] 연결 테스트 시작');
  
  let initialDataReceived = false;
  let testTimeout: ReturnType<typeof setTimeout>;
  // 초기 데이터 수신 대기 (10초 타임아웃)
  const waitForInitialData = () => {
    testTimeout = setTimeout(() => {
      if (!initialDataReceived) {
        console.warn('[Global SSE] 연결 테스트 실패 - 초기 데이터 수신 타임아웃');
        updateConnectionStatus('error');
        const errorInfo = {
          type: 'timeout' as const,
          message: '초기 데이터 수신 시간 초과',
          timestamp: Date.now(),
          retryAttempt
        };
        updateErrorInfo(errorInfo);
      }
    }, 10000);
  };
  
  // 초기 데이터 수신 리스너
  const testListener = (_data: Basket) => {
    if (!initialDataReceived) {
      initialDataReceived = true;
      clearTimeout(testTimeout);
      console.log('[Global SSE] 연결 테스트 성공 - 초기 데이터 수신 확인');
      updateConnectionStatus('connected');
      
      // 테스트 리스너 제거
      globalListeners.delete(testListener);
    }
  };
  
  // 테스트 리스너 등록 및 타이머 시작
  globalListeners.add(testListener);
  waitForInitialData();
}

// 초기 데이터는 SSE의 'basket-initial' 이벤트로 전달되므로
// 별도 REST 호출(fetchCurrentBasketData)은 사용하지 않습니다.

// 연결 상태 체크 함수
function startConnectionCheck(): void {
  // 기존 체크 인터벌 정리
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  
  let checkCount = 0;
  
  // 10초마다 연결 상태 체크 (더 빠른 감지를 위해)
  connectionCheckInterval = setInterval(() => {
    const readyState = globalEventSource?.readyState;
    checkCount++;
    
    // 로그 빈도 줄이기 - 12번에 1번만 로그 출력 (1분에 1번)
    if (checkCount % 12 === 0) {
      const stateText = readyState === 0 ? 'CONNECTING' : 
                       readyState === 1 ? 'OPEN' : 
                       readyState === 2 ? 'CLOSED' : 'UNKNOWN';
      console.log(`[Global SSE] 연결 상태 체크 - 상태: ${stateText}, 리스너 수: ${globalListeners.size}`);
    }
    
    // 연결이 끊어진 경우 재연결 시도
    if (readyState === 2 && !isConnecting) {
      console.log('[Global SSE] 연결이 끊어짐 감지 - 재연결 시도');
      reconnectGlobalSSE();
    }
    
    // 연결이 너무 오래 CONNECTING 상태인 경우 (30초 이상)
    if (readyState === 0 && !isConnecting) {
      const connectionTime = Date.now() - (globalEventSource?._connectionStartTime || 0);
      if (connectionTime > 30000) {
        console.log('[Global SSE] 연결 타임아웃 감지 - 재연결 시도');
        reconnectGlobalSSE();
      }
    }
  }, 5000); // 5초마다 체크
}

function stopConnectionCheck(): void {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
}

// SSE 연결 함수
async function connectGlobalSSE(basketId: string | null, token: string | null): Promise<void> {
  // 이미 연결 중이거나 유효한 연결이 있으면 중복 연결 방지
  if (isConnecting || (globalEventSource && globalEventSource.readyState === EventSource.OPEN)) {
    console.log('[Global SSE] 이미 연결 중이거나 연결됨 - 중복 연결 방지');
    return;
  }

  if (!basketId || !token) {
    console.log('[Global SSE] 연결 조건 불충족 - basketId:', basketId, 'hasToken:', !!token);
    return;
  }

  // 활성화된 장바구니인지 확인 후에만 연결 (재시도 로직 추가)
  const maxRetries = 15; // 10 → 15로 증가
  const retryDelay = 300; // 200ms → 300ms로 증가
  let activatedId: string | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const storeState = useBasketStore.getState();
      activatedId = storeState?.activatedBasketId || null;
      
      if (activatedId === basketId) {
        console.log('[Global SSE] 프론트엔드 활성화 상태 확인 완료');
        
        // 추가 검증: 백엔드 준비 상태 확인
        const isBackendReady = await verifyBackendReadiness(basketId, token);
        if (isBackendReady) {
          console.log('[Global SSE] 백엔드 준비 상태 확인 완료 - 연결 진행');
          break;
        } else {
          console.log('[Global SSE] 백엔드 아직 준비되지 않음 - 재시도');
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
      }
      
      if (i === maxRetries - 1) {
        console.log('[Global SSE] 활성화 대기 시간 초과 - 연결 보류. basketId:', basketId, 'activatedId:', activatedId);
        return;
      }
      
      // 로그 빈도 줄이기 - 5번에 1번만 로그 출력
      if (i % 5 === 0 || i === maxRetries - 1) {
        console.log(`[Global SSE] 활성화 대기 중... (${i + 1}/${maxRetries})`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
    } catch (e) {
      console.warn('[Global SSE] 활성화 상태 확인 중 오류:', e);
      if (i === maxRetries - 1) return;
    }
  }

  // 기존 연결 정리
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }

  isConnecting = true;
  updateConnectionStatus('connecting');
  console.log('[Global SSE] 연결 시도 - basketId:', basketId);
  
  // 연결 시작 시간 기록
  const connectionStartTime = Date.now();

  try {
    const url = `${config.API_BASE_URL}/api/baskets/my/stream`;
    console.log('[Global SSE] 연결 URL:', url);
    console.log('[Global SSE] API_BASE_URL:', config.API_BASE_URL);
    
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
      }) as ExtendedEventSource;
      
    // 연결 시작 시간을 EventSource 객체에 저장
    globalEventSource._connectionStartTime = connectionStartTime;

    // EventSource 이벤트 리스너 설정
    if (globalEventSource) {
      globalEventSource.onopen = () => {
        console.log("[Global SSE] SSE 연결 성공");
        isConnecting = false;
        retryAttempt = 0; // 연결 성공 시 재시도 횟수 초기화
        
        // 연결 성공 후 실제 메시지 수신 가능 여부 테스트
        testSSEConnection();
        
        // 연결 상태 체크를 더 빠르게 시작 (15초 → 5초)
        startConnectionCheck();
      };

      // 바구니 데이터 처리 함수
      const handleBasketData = (data: Basket): void => {
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
           const addedItems = currentItems.filter((currentItem: BasketItem) => 
             !previousItems.some((prevItem: BasketItem) => 
               prevItem.epcPattern === currentItem.epcPattern
             )
           );
           
           // 상품이 추가된 경우에만 toast 표시 및 알림 상태 설정
           if (addedItems.length > 0) {
             const addedItem = addedItems[0];
             const productName = addedItem?.product?.name || '상품';
             const productImageUrl = addedItem?.product?.imageUrl;
             
             console.log("[Global SSE] 상품 추가 감지:", productName);
             ToastManager.basketAdded(productName, productImageUrl);
             
             // 새로운 상품 알림 상태 설정 (현재 페이지가 장바구니 페이지가 아닐 때만)
             try {
               const currentPath = window.location.pathname;
               const isOnBasketPage = currentPath === '/baskets';
               
               if (!isOnBasketPage) {
                 const store = useBasketStore.getState();
                 if (store.setHasNewItems) {
                   store.setHasNewItems(true);
                   console.log("[Global SSE] 새로운 상품 알림 상태 설정 (장바구니 페이지 아님)");
                 }
               } else {
                 console.log("[Global SSE] 장바구니 페이지에서 상품 추가 - 알림 생략");
               }
             } catch (error) {
               console.error("[Global SSE] 새로운 상품 알림 상태 설정 실패:", error);
             }
           }
         } else if (data && data.items && data.items.length > 0 && (!globalBasketData || !globalBasketData.items)) {
           // 첫 번째 데이터 수신 시에도 상품 추가 알림
           const firstItem = data.items[0];
           const productName = firstItem?.product?.name || '상품';
           const productImageUrl = firstItem?.product?.imageUrl;
           
           console.log("[Global SSE] 초기 상품 감지:", productName);
           ToastManager.basketAdded(productName, productImageUrl);
           
           // 새로운 상품 알림 상태 설정 (현재 페이지가 장바구니 페이지가 아닐 때만)
           try {
             const currentPath = window.location.pathname;
             const isOnBasketPage = currentPath === '/baskets';
             
             if (!isOnBasketPage) {
               const store = useBasketStore.getState();
               if (store.setHasNewItems) {
                 store.setHasNewItems(true);
                 console.log("[Global SSE] 초기 상품 알림 상태 설정 (장바구니 페이지 아님)");
               }
             } else {
               console.log("[Global SSE] 장바구니 페이지에서 초기 상품 감지 - 알림 생략");
             }
           } catch (error) {
             console.error("[Global SSE] 초기 상품 알림 상태 설정 실패:", error);
           }
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
              store.setBasketData(data as BasketData);
              console.log("[Global SSE] Store에 데이터 저장:", data?.items?.length || 0, "개 상품");
            }
          } catch (error) {
            console.error("[Global SSE] Store 데이터 저장 실패:", error);
          }

         // 서비스 워커에 데이터 전송
         if (typeof window !== 'undefined' && 'sendBasketUpdateToSW' in window) {
           (window as { sendBasketUpdateToSW: (data: Basket) => void }).sendBasketUpdateToSW(data);
         }
       };

      // 이벤트 리스너 설정
      globalEventSource.addEventListener('basket-initial', (event: MessageEvent) => {
        try {
          const data: Basket = JSON.parse(event.data);
          handleBasketData(data);
        } catch (e) {
          console.error("[Global SSE] basket-initial 데이터 파싱 실패:", e);
        }
      });

      globalEventSource.addEventListener('basket-update', (event: MessageEvent) => {
        try {
          const data: Basket = JSON.parse(event.data);
          handleBasketData(data);
        } catch (e) {
          console.error("[Global SSE] basket-update 데이터 파싱 실패:", e);
        }
      });

      globalEventSource.onerror = (error: Event) => {
        console.log("[Global SSE] 연결 에러 - 재연결 준비", error);

        // 에러 분류 및 정보 업데이트
        const errorInfo = classifyError(error);
        updateErrorInfo(errorInfo);

        if (globalEventSource) {
          globalEventSource.close();
          globalEventSource = null;
        }
      });

        isConnecting = false;
        updateConnectionStatus('error');
        stopConnectionCheck();

        // 인증 에러인 경우 재연결 중단
        if (errorInfo.type === 'auth') {
          console.log("[Global SSE] 인증 에러로 인해 재연결 중단");
          return;
        }

        // 지수 백오프 + 지터 적용 (최대 30초)
        const baseDelayMs = Math.min(30000, Math.pow(2, Math.max(0, retryAttempt)) * 1000);
        const jitterMs = Math.floor(Math.random() * 500);
        const delayMs = baseDelayMs + jitterMs;
        retryAttempt = Math.min(retryAttempt + 1, 10);

        console.log(`[Global SSE] ${delayMs}ms 후 재연결 시도 (attempt=${retryAttempt})`);
        updateConnectionStatus('reconnecting');
        setTimeout(() => {
          if (!isConnecting) {
            reconnectGlobalSSE();
          }
        }, delayMs);
      };
    }

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.warn("[Global SSE] EventSource 생성 실패:", errorMessage);
    
    // 에러 분류 및 정보 업데이트
    const errorInfo = classifyError(e);
    updateErrorInfo(errorInfo);
    
    isConnecting = false;
    updateConnectionStatus('error');
  }
}

// 전역 SSE 훅 (수동 연결 전용)
export function useGlobalBasketSSE(): Basket | null {
  const { accessToken: token } = useAuth();
  const basketId = useBasketStore((s: any) => s.basketId);
  const activatedBasketId = useBasketStore((s: any) => s.activatedBasketId);
  const setBasketData = useBasketStore((s: any) => s.setBasketData);

  const [basket, setBasket] = useState<Basket | null>(null);
  const listenerRef = useRef<((data: Basket) => void) | null>(null);

  // 자동 연결 비활성화 - 이제 수동으로만 연결
  // 활성화 완료 후 reconnectGlobalSSE()를 통해서만 연결
  console.log('[Global SSE] 훅 초기화 - 자동 연결 비활성화, 수동 연결 대기 중');
  console.log('[Global SSE] 현재 상태 - basketId:', basketId, 'activatedBasketId:', activatedBasketId, 'hasToken:', !!token);

  // 리스너 등록
  useEffect(() => {
    listenerRef.current = (data: Basket) => {
      setBasket(data);
      setBasketData(data as BasketData);
    };
    globalListeners.add(listenerRef.current);

    // 기존 데이터가 있으면 즉시 설정
    if (globalBasketData) {
      setBasket(globalBasketData);
      setBasketData(globalBasketData as BasketData);
    }

    return () => {
      if (listenerRef.current) {
        globalListeners.delete(listenerRef.current);
      }
    };
  }, [setBasketData]);

  return basket;
}

// SSE 연결 상태를 구독하는 훅
export function useSSEConnectionStatus(): SSEConnectionStatus {
  const [status, setStatus] = useState<SSEConnectionStatus>(currentStatus);
  
  useEffect(() => {
    const statusListener = (newStatus: SSEConnectionStatus) => {
      setStatus(newStatus);
    };
    
    globalStatusListeners.add(statusListener);
    
    // 현재 상태로 초기화
    setStatus(currentStatus);
    
    return () => {
      globalStatusListeners.delete(statusListener);
    };
  }, []);
  
  return status;
}

// SSE 에러 정보를 구독하는 훅
export function useSSEErrorInfo(): SSEErrorInfo | null {
  const [errorInfo, setErrorInfo] = useState<SSEErrorInfo | null>(lastError);
  
  useEffect(() => {
    const errorListener = (newError: SSEErrorInfo) => {
      setErrorInfo(newError);
    };
    
    globalErrorListeners.add(errorListener);
    
    // 현재 에러 정보로 초기화
    setErrorInfo(lastError);
    
    return () => {
      globalErrorListeners.delete(errorListener);
    };
  }, []);
  
  return errorInfo;
}

// 전역 SSE 연결 해제 함수
export function disconnectGlobalSSE(): void {
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
  globalBasketData = null;
  globalListeners.clear();
  globalStatusListeners.clear();
  globalErrorListeners.clear();
  isConnecting = false;
  lastError = null;
  updateConnectionStatus('disconnected');
  stopConnectionCheck(); // 연결 체크 중지
}

// 수동 재연결 함수
export function reconnectGlobalSSE(): void {
  console.log('[Global SSE] 수동 재연결 요청');
  
  // 기존 연결 정리
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
  
  isConnecting = false;
  retryAttempt = 0; // 수동 재연결 시도 시 백오프 초기화
  updateConnectionStatus('connecting');
  
  // 현재 상태에서 재연결
  try {
    const store = useBasketStore.getState();
    const basketId = store?.basketId || null;
    const activatedBasketId = store?.activatedBasketId || null;
    const token = authStorage.getAccessToken();
    
    if (basketId && token && activatedBasketId === basketId) {
      console.log('[Global SSE] 재연결 조건 충족 - 연결 시작');
      // 활성화가 이미 완료된 상태이므로 즉시 연결
      setTimeout(async () => {
        await connectGlobalSSE(basketId, token);
      }, 100); // 빠른 재연결
    } else {
      console.warn('[Global SSE] 재연결 조건 불충족');
      updateConnectionStatus('disconnected');
    }
  } catch (error) {
    console.error('[Global SSE] 재연결 실패:', error);
    updateConnectionStatus('error');
    const errorInfo = {
      type: 'unknown' as const,
      message: '재연결 중 오류 발생',
      timestamp: Date.now(),
      retryAttempt
    };
    updateErrorInfo(errorInfo);
  }
} 