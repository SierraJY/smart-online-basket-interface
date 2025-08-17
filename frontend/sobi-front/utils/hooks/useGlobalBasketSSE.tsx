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

// 전역 변수들
let globalEventSource: EventSource | null = null;
let globalBasketData: Basket | null = null;
const globalListeners = new Set<((data: Basket) => void)>();
let isConnecting = false;

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

  // 기존 연결 정리
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }

  isConnecting = true;
  console.log('[Global SSE] 연결 시도 - basketId:', basketId);

  try {
    const url = `${config.API_BASE_URL}/api/baskets/my/stream`;
    console.log('[Global SSE] 연결 URL:', url);
    console.log('[Global SSE] JWT 토큰 확인:', token ? `${token.substring(0, 20)}...` : '토큰 없음');
    
    // EventSourcePolyfill 사용 (헤더 최소화: Authorization만)
    globalEventSource = new EventSourcePolyfill(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // 인프라 유휴 타임아웃보다 짧게 설정 (예: 2분)
      heartbeatTimeout: 120000,
      // 초기 연결 타임아웃/재시도 주기
      connectionTimeout: 30000,
      retryInterval: 3000,
      // withCredentials는 쿠키를 쓰지 않으므로 생략
      // maxRetries는 기본 동작에 맡김(무한 재시도) 또는 필요 시 값 지정
    });

    // EventSource 이벤트 리스너 설정
    if (globalEventSource) {
      globalEventSource.onopen = () => {
        console.log("[Global SSE] SSE 연결 성공");
        isConnecting = false;
      };
    }

    // 바구니 데이터 처리 함수
    const handleBasketData = (data: Basket): void => {
      console.log("[Global SSE] 데이터 수신됨:", data?.items?.length || 0, "개 상품");
      
      // 데이터 유효성 검증
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
        
        // 상품이 추가된 경우에만 toast 표시
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
    if (globalEventSource) {
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

    // 하트비트 이벤트 처리
          globalEventSource.addEventListener('heartbeat', (event: MessageEvent) => {
        try {
          const heartbeatData = JSON.parse(event.data);
          console.log("[Global SSE] 하트비트 수신:", heartbeatData.timestamp);
          
          // 연결 즉시 하트비트인 경우 연결 상태 확인
          if (heartbeatData.connection === 'established') {
            console.log("[Global SSE] 연결 즉시 하트비트 수신 - SSE 연결 준비 완료");
          }
        } catch (e) {
          console.error("[Global SSE] 하트비트 데이터 파싱 실패:", e);
        }
      });

          globalEventSource.onerror = (error: Event) => {
      console.warn("[Global SSE] 에러 발생(폴리필 자동 재시도 대기):", error);
      // 폴리필이 내부적으로 재시도하므로 수동 close/재연결하지 않음
      isConnecting = false;
    };
    }

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.warn("[Global SSE] EventSource 생성 실패:", errorMessage);
    isConnecting = false;
  }
}

// 전역 SSE 훅
export function useGlobalBasketSSE(): Basket | null {
  const { accessToken: token } = useAuth();
  const basketId = useBasketStore((s: any) => s.basketId);
  const activatedBasketId = useBasketStore((s: any) => s.activatedBasketId);
  const setBasketData = useBasketStore((s: any) => s.setBasketData);

  const [basket, setBasket] = useState<Basket | null>(null);
  const listenerRef = useRef<((data: Basket) => void) | null>(null);

  // 리스너 등록
  useEffect(() => {
    console.log('[Global SSE] 훅 초기화');
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

  // 연결 관리 - 전역에서 자동 연결
  useEffect(() => {
    if (basketId && token && activatedBasketId === basketId) {
      console.log('[Global SSE] 연결 조건 충족 - 연결 시작');
      connectGlobalSSE(basketId, token);
    } else if (basketId && token) {
      console.log('[Global SSE] 연결 조건 대기 중 - basketId:', basketId, 'activatedBasketId:', activatedBasketId);
    }
  }, [basketId, token, activatedBasketId]);

  return basket;
}

// 전역 SSE 연결 해제 함수
export function disconnectGlobalSSE(): void {
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
  globalBasketData = null;
  globalListeners.clear();
  isConnecting = false;
}

// 수동 재연결 함수
export function reconnectGlobalSSE(): void {
  console.log('[Global SSE] 수동 재연결 요청');
  
  // 이미 OPEN 상태면 재연결 스킵 (중복 연결 방지)
  if (globalEventSource && globalEventSource.readyState === EventSource.OPEN) {
    console.log('[Global SSE] 이미 OPEN 상태 - 재연결 스킵');
    return;
  }

  // 기존 연결이 존재하지만 OPEN이 아니라면 정리 후 재시도
  if (globalEventSource) {
    try { globalEventSource.close(); } catch {}
    globalEventSource = null;
  }
  
  isConnecting = false;
  
  // 현재 상태에서 재연결
  try {
    const store = useBasketStore.getState();
    const basketId = store?.basketId || null;
    const activatedBasketId = store?.activatedBasketId || null;
    const token = authStorage.getAccessToken();
    
    if (basketId && token && activatedBasketId === basketId) {
      console.log('[Global SSE] 재연결 조건 충족 - 연결 시작');
      connectGlobalSSE(basketId, token);
    } else {
      console.warn('[Global SSE] 재연결 조건 불충족');
    }
  } catch (error) {
    console.error('[Global SSE] 재연결 실패:', error);
  }
}

// SSE 연결 상태를 구독하는 훅 (개선)
export function useSSEConnectionStatus(): 'disconnected' | 'connecting' | 'connected' | 'error' {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  useEffect(() => {
    const checkStatus = () => {
      if (isConnecting) {
        setStatus('connecting');
      } else if (globalEventSource && globalEventSource.readyState === EventSource.OPEN) {
        setStatus('connected');
      } else if (globalEventSource && globalEventSource.readyState === EventSource.CLOSED) {
        setStatus('error');
      } else {
        setStatus('disconnected');
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 2000); // 2초마다 체크
    
    return () => clearInterval(interval);
  }, []);
  
  return status;
}

// SSE 에러 정보를 구독하는 훅 (단순화)
export function useSSEErrorInfo(): { message: string } | null {
  return null; // 단순화를 위해 에러 정보는 반환하지 않음
} 