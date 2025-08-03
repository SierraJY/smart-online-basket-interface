import { useEffect, useRef, useState } from "react";
import { useBasketStore } from "@/store/useBasketStore";
import { useAuth } from "@/utils/hooks/useAuth";
import { authStorage } from "@/utils/storage";
import { config } from "@/config/env";
import ToastManager from '@/utils/toastManager';
import { refreshToken as refreshTokenApi } from '@/utils/api/auth';
// @ts-ignore
import { NativeEventSource, EventSourcePolyfill } from 'event-source-polyfill';

// EventSource polyfill 설정
const EventSource = NativeEventSource || EventSourcePolyfill;

// 전역 변수들
let globalEventSource: EventSource | null = null;
let globalConnectionMonitor: NodeJS.Timeout | null = null;
let globalBasketData: any = null;
let globalListeners = new Set<((data: any) => void)>();
let globalReconnectAttempts = 0;
let globalMaxReconnectAttempts = 5;
let globalReconnectDelay = 1000; // 1초
let isConnecting = false; // 연결 중인지 체크하는 플래그
let lastDataTime = Date.now(); // 마지막 데이터 수신 시간

// 디버깅 모드 설정
const SSE_DEBUG = process.env.NEXT_PUBLIC_SSE_DEBUG === 'true';

// 디버깅 로그 함수
const sseLog = (message: string, ...args: any[]) => {
  if (SSE_DEBUG) {
    console.log(`[Global SSE] ${message}`, ...args);
  }
};

// 토큰 갱신 함수
async function refreshTokenIfNeeded(): Promise<string | null> {
  try {
    const currentToken = authStorage.getAccessToken();
    const refreshToken = authStorage.getRefreshToken();
    
    if (!currentToken || !refreshToken) {
      console.log('[Global SSE] 토큰이 없습니다');
      return null;
    }
    
    // 토큰 만료 체크 (안전한 방식)
    try {
      const parts = currentToken.split('.');
      if (parts.length !== 3) {
        console.log('[Global SSE] 토큰 형식이 올바르지 않습니다');
        return null;
      }
      
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (decoded.exp < currentTime) {
        console.log('[Global SSE] 토큰이 만료되어 갱신을 시도합니다');
        const data = await refreshTokenApi(refreshToken);
        authStorage.setAccessToken(data.accessToken);
        return data.accessToken;
      }
      
      return currentToken;
    } catch (parseError) {
      console.error('[Global SSE] 토큰 파싱 실패:', parseError);
      return null;
    }
  } catch (error) {
    console.error('[Global SSE] 토큰 갱신 실패:', error);
    return null;
  }
}



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

  // 토큰 갱신 시도
  const freshToken = await refreshTokenIfNeeded();
  if (!freshToken) {
    console.log('[Global SSE] 토큰 갱신 실패 - 연결 중단');
    return;
  }

  // 기존 연결 정리
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }

  isConnecting = true;
  console.log('[Global SSE] 연결 시도 - basketId:', basketId, 'hasToken:', !!freshToken);

  function connectSSE() {
    try {
      const url = `${config.API_BASE_URL}/api/baskets/my/stream?basketId=${basketId}`;
      sseLog('EventSource 연결 시도! basketId:', basketId, 'token:', freshToken?.substring(0, 50) + '...');
      
      // EventSourcePolyfill 사용 (Authorization 헤더 지원)
      globalEventSource = new EventSourcePolyfill(url, {
        headers: {
          'Authorization': `Bearer ${freshToken}`,
          'Content-Type': 'text/event-stream',
        },
        heartbeatTimeout: 120000, // 60초 heartbeat 타임아웃 (충분히 큰 값)
        // connectionTimeout: 60000, // 60초 연결 타임아웃
        // retryInterval: 10000, // 재연결 간격 10초로 단축 (빠른 복구)
        // maxRetries: 20, // 최대 재연결 시도 횟수 증가
        // withCredentials: false, // CORS 설정
      });
      
      // Authorization 헤더는 URL 파라미터로 전달
      // const urlWithToken = `${url}&token=${encodeURIComponent(token)}`;
      // globalEventSource = new EventSource(urlWithToken);

      let lastDataTime = Date.now();
      
      // 연결 상태 모니터링 (30초마다 체크 - 더 안정적으로)
      globalConnectionMonitor = setInterval(() => {
        const now = Date.now();
        const timeSinceLastData = now - lastDataTime;
        
        // 120초간 데이터가 없으면 재연결 시도 (더 관대하게)
        if (timeSinceLastData > 120000) {
          console.warn("[Global SSE] 120초간 데이터 없음 - 재연결 시도");
          if (globalConnectionMonitor !== null) {
            clearInterval(globalConnectionMonitor);
            globalConnectionMonitor = null;
          }
          if (globalEventSource) {
            globalEventSource.close();
            globalEventSource = null;
          }
          isConnecting = false;
          // 재연결 시도
          setTimeout(() => {
            if (globalReconnectAttempts < globalMaxReconnectAttempts) {
              globalReconnectAttempts++;
              console.log(`[Global SSE] 재연결 시도 ${globalReconnectAttempts}/${globalMaxReconnectAttempts}`);
              connectGlobalSSE(basketId, freshToken);
            } else {
              console.error("[Global SSE] 최대 재연결 시도 횟수 초과. 수동으로 페이지를 새로고침해주세요.");
            }
          }, globalReconnectDelay * globalReconnectAttempts); // 지수 백오프
        }
      }, 30000); // 30초마다 체크

      // EventSource 이벤트 리스너 설정
      if (globalEventSource) {
        globalEventSource.onopen = () => {
          console.log("[Global SSE] SSE 연결 성공");
          isConnecting = false;
          globalReconnectAttempts = 0; // 연결 성공 시 재연결 시도 횟수 리셋
          lastDataTime = Date.now(); // 연결 성공 시 시간 업데이트
        };

        // 바구니 데이터 처리 함수
        const handleBasketData = (data: any) => {
          console.log("[Global SSE] 데이터 수신됨:", data?.items?.length || 0, "개 상품");
          lastDataTime = Date.now(); // 데이터 수신 시 시간 업데이트
          
          // 데이터 유효성 검증
          if (!data || !Array.isArray(data.items)) {
            console.warn("[Global SSE] 유효하지 않은 데이터 구조:", data);
            return;
          }
          
          // 유효한 아이템만 필터링 (product가 null이 아닌 것만)
          const validItems = data.items.filter((item: any) => 
            item && item.epcPattern && item.product && item.product.id
          );
          
          const invalidItems = data.items.filter((item: any) => 
            !item || !item.epcPattern || !item.product || !item.product.id
          );
          
          if (invalidItems.length > 0) {
            console.warn("[Global SSE] 유효하지 않은 아이템들:", invalidItems);
          }
          
          // 유효한 데이터로 재구성
          const validData = {
            ...data,
            items: validItems,
            totalCount: validItems.length, // 백엔드 명세에 맞게 totalCount 사용
            totalPrice: validItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0)
          };
          
          // 상품 추가 감지 및 toast 알림
          if (validData && validData.items) {
            let shouldShowToast = false;
            let addedProductName = '';
            
            if (globalBasketData && globalBasketData.items) {
              const previousItemCount = globalBasketData.items.length;
              const currentItemCount = validData.items.length;
              
              // 상품 개수가 증가했을 때만 toast 표시
              if (currentItemCount > previousItemCount) {
                const addedItems = validData.items.filter((currentItem: any) => 
                  !globalBasketData.items.some((prevItem: any) => 
                    prevItem.epcPattern === currentItem.epcPattern
                  )
                );
                
                if (addedItems.length > 0) {
                  shouldShowToast = true;
                  addedProductName = addedItems[0]?.product?.name || '상품';
                }
              }
            }
            
            // Toast 표시 (실제 상품 추가 시에만)
            if (shouldShowToast && addedProductName) {
              // 상품 이미지 URL 가져오기
              const productImageUrl = validData.items.find((item: any) => 
                item.product?.name === addedProductName
              )?.product?.imageUrl;
              
              // ToastManager를 사용하여 toast 표시
              ToastManager.basketAdded(addedProductName, productImageUrl);
            }
          }
          
          globalBasketData = validData;

          // 모든 리스너에게 데이터 전달
          for (const listener of globalListeners) {
            if (listener) listener(validData);
          }

                  // store에도 저장
        try {
          const store = useBasketStore.getState();
          if (store.setBasketData) {
            store.setBasketData(validData);
            console.log("[Global SSE] Store에 데이터 저장:", validData?.items?.length || 0, "개 상품");
          } else {
            console.error("[Global SSE] store에서 setBasketData를 찾을 수 없음");
          }
        } catch (error) {
          console.error("[Global SSE] Store 데이터 저장 실패:", error);
        }

          // 서비스 워커에 데이터 전송
          if (typeof window !== 'undefined' && (window as any).sendBasketUpdateToSW) {
            (window as any).sendBasketUpdateToSW(validData);
          }
        };

        // 모든 이벤트를 캐치하는 리스너 추가
        globalEventSource.addEventListener('basket-initial', (event: MessageEvent) => {
          console.log("[Global SSE] 초기 데이터 수신:", event.data);
          try {
            const data = JSON.parse(event.data);
            handleBasketData(data);
          } catch (e) {
            console.error("[Global SSE] basket-initial 데이터 파싱 실패:", e);
          }
        });

        globalEventSource.addEventListener('basket-update', (event: MessageEvent) => {
          console.log("[Global SSE] 업데이트 데이터 수신:", event.data);
          try {
            const data = JSON.parse(event.data);
            handleBasketData(data);
          } catch (e) {
            console.error("[Global SSE] basket-update 데이터 파싱 실패:", e);
          }
        });

        globalEventSource.addEventListener('error', (event: MessageEvent) => {
          // event.data가 undefined일 수 있으므로 안전하게 처리
          const errorData = event.data || 'Unknown error';
          
          // 에러 타입에 따른 처리
          if (typeof errorData === 'string') {
            if (errorData.includes('timeout') || errorData.includes('No activity')) {
              console.log("[Global SSE] 타임아웃 에러 - 재연결 시도");
            } else if (errorData.includes('401') || errorData.includes('Unauthorized') || errorData.includes('로그인이 필요합니다')) {
              console.warn("[Global SSE] 인증 에러 - 토큰 갱신 필요");
              // 토큰 갱신 시도
              setTimeout(() => {
                refreshTokenIfNeeded().then(newToken => {
                  if (newToken) {
                    console.log("[Global SSE] 토큰 갱신 후 재연결 시도");
                    connectGlobalSSE(basketId, newToken);
                  }
                });
              }, 1000);
            } else if (errorData.includes('404') || errorData.includes('Not Found')) {
              console.warn("[Global SSE] 리소스 없음 - basketId 확인 필요");
            } else if (errorData === 'Unknown error') {
              // Unknown error는 일반적으로 일시적인 네트워크 문제이므로 조용히 처리
              console.log("[Global SSE] 일시적인 연결 문제 - 자동 복구 대기");
            } else {
              console.warn("[Global SSE] 일반 에러:", errorData);
            }
          }
        });

        globalEventSource.addEventListener('open', (event: Event) => {
          console.log("[Global SSE] 연결 성공"); // 간단한 연결 성공 알림
        });

        globalEventSource.addEventListener('close', (event: Event) => {
          // console.log("[Global SSE] close 이벤트 수신"); // 로그 정리
        });

        globalEventSource.onmessage = (event: MessageEvent) => {
          lastDataTime = Date.now(); // 데이터 수신 시간 업데이트
          
          if (event.data.trim() === "") {
            return;
          }

          try {
            const data = JSON.parse(event.data);
            console.log("[Global SSE] 📨 일반 메시지 수신"); // 일반 메시지 수신 알림
            handleBasketData(data);
          } catch (e) {
            console.error("[Global SSE] JSON 파싱 실패! 원본:", event.data, "에러:", e);
          }
        };

        globalEventSource.onerror = (error: Event) => {
          const errorMessage = error.toString();
          const isTimeoutError = errorMessage.includes('No activity within');
          
          // readyState가 2(CLOSED)인 경우는 정상적인 연결 종료이므로 로깅하지 않음
          if (globalEventSource?.readyState === 2) {
            return;
          }
          
          if (isTimeoutError) {
            console.log("[Global SSE] ⏰ 타임아웃 - 재연결 중...");
          } else {
            // 일시적인 네트워크 문제는 조용히 처리
            console.log("[Global SSE] 일시적인 연결 문제 - 자동 복구 대기");
          }
          
          // 연결 상태 확인 (에러 시에만)
          // console.log("[Global SSE] 현재 연결 상태:", globalEventSource?.readyState); // 로그 정리
          
          if (globalConnectionMonitor) {
            clearInterval(globalConnectionMonitor);
            globalConnectionMonitor = null;
          }
          
          if (globalEventSource) {
            globalEventSource.close();
            globalEventSource = null;
          }
          
          isConnecting = false;
          
          // 에러 발생 시 재연결 시도
          if (globalReconnectAttempts < globalMaxReconnectAttempts) {
            globalReconnectAttempts++;
            // console.log(`[Global SSE] 재연결 시도 ${globalReconnectAttempts}/${globalMaxReconnectAttempts}`); // 로그 정리
            setTimeout(() => {
              connectGlobalSSE(basketId, freshToken);
            }, globalReconnectDelay * globalReconnectAttempts); // 지수 백오프
          } else {
            console.error("[Global SSE] 최대 재연결 시도 횟수 초과. 수동으로 페이지를 새로고침해주세요.");
          }
        };
      }

    } catch (e: any) {
      console.warn("[Global SSE] EventSource 생성 실패, 재연결을 시도합니다:", e.message || e);
      
      // 에러 발생 시 재연결 시도
      if (globalReconnectAttempts < globalMaxReconnectAttempts) {
        globalReconnectAttempts++;
        // console.log(`[Global SSE] 재연결 시도 ${globalReconnectAttempts}/${globalMaxReconnectAttempts}`); // 로그 정리
        setTimeout(() => {
          connectGlobalSSE(basketId, freshToken);
        }, globalReconnectDelay * globalReconnectAttempts); // 지수 백오프
      } else {
        console.error("[Global SSE] 최대 재연결 시도 횟수 초과. 수동으로 페이지를 새로고침해주세요.");
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
  const activatedBasketId = useBasketStore(s => s.activatedBasketId);
  const setBasketData = useBasketStore(s => s.setBasketData);
  const basketData = useBasketStore(s => s.basketData);

  const [basket, setBasket] = useState<any>(null);
  const listenerRef = useRef<((data: any) => void) | null>(null);
  const [activationTrigger, setActivationTrigger] = useState(0);

  // Store 상태 로깅 (디버깅용)
  useEffect(() => {
    console.log('[Global SSE] Store 상태 변경:', {
      basketId,
      activatedBasketId,
      hasToken: !!token
    });
  }, [basketId, activatedBasketId, token]);

  // SSE 연결 관리
  useEffect(() => {
    if (!token || !basketId) {
      console.log('[Global SSE] 연결 조건 불충족 - token:', !!token, 'basketId:', basketId);
      return;
    }

    console.log('[Global SSE] 연결 조건 충족 - SSE 연결 시작 (활성화 상태 무관)');
    
    // 연결 지연 (Store hydration 완료 대기)
    const connectionTimer = setTimeout(() => {
      connectGlobalSSE(basketId, token).catch(error => {
        console.error('[Global SSE] 연결 실패:', error);
      });
    }, 500); // 500ms 지연
    
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
      setBasketData(data); // store에도 저장
    };
    globalListeners.add(listenerRef.current);

    // 기존 데이터가 있으면 즉시 설정
    if (globalBasketData) {
      setBasket(globalBasketData);
      setBasketData(globalBasketData);
    }

    return () => {
      // 리스너 제거
      if (listenerRef.current) {
        globalListeners.delete(listenerRef.current);
      }
    };
  }, [setBasketData]);

  // 활성화 완료 후 SSE 재연결을 위한 전역 함수 노출
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).triggerSSEReconnect = () => {
        console.log('[Global SSE] 재연결 트리거됨');
        setActivationTrigger(prev => prev + 1);
      };
      
      // 개선된 재연결 함수
      (window as any).reconnectSSE = () => {
        console.log('[Global SSE] 전역 재연결 함수 호출');
        reconnectGlobalSSE();
      };
      
      // Toast 테스트 함수 추가
      (window as any).testBasketToast = () => {
        console.log('[Global SSE] Toast 테스트 실행');
        ToastManager.basketAdded('테스트 상품', 'https://sitem.ssgcdn.com/00/12/84/item/1000549841200_i1_290.jpg');
      };
      
      // 현재 상태 확인 함수
      (window as any).checkSSEState = () => {
        const state = {
          basketId,
          activatedBasketId,
          hasToken: !!token,
          globalEventSource: !!globalEventSource,
          readyState: globalEventSource?.readyState,
          lastDataTime: new Date(lastDataTime).toLocaleTimeString()
        };
        console.log('[Global SSE] 현재 상태:', state);
        return state;
      };
    }
  }, [basketId, activatedBasketId, token]);

  return basket;
}

// 전역 SSE 연결 해제 함수 (필요시 사용)
export function disconnectGlobalSSE() {
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
  if (globalConnectionMonitor !== null) {
    clearInterval(globalConnectionMonitor);
    globalConnectionMonitor = null;
  }
  globalBasketData = null;
  globalListeners.clear();
  globalReconnectAttempts = 0; // 재연결 시도 횟수 리셋
  isConnecting = false;
}

// 수동 재연결 함수
export function reconnectGlobalSSE() {
  console.log('[Global SSE] 수동 재연결 요청');
  
  // 기존 연결 정리
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
  
  if (globalConnectionMonitor) {
    clearInterval(globalConnectionMonitor);
    globalConnectionMonitor = null;
  }
  

  
  // 재연결 시도 횟수 리셋
  globalReconnectAttempts = 0;
  isConnecting = false;
  
  // 현재 상태에서 재연결 (더 안전한 방식)
  let basketId: string | null = null;
  let token: string | null = null;
  
  try {
    // 1. Store에서 직접 가져오기
    const store = useBasketStore.getState();
    basketId = store?.basketId || null;
    console.log('[Global SSE] Store에서 basketId 가져옴:', basketId);
    
    // 2. Store가 없으면 localStorage에서 직접 가져오기
    if (!basketId) {
      try {
        const stored = localStorage.getItem('basket-storage');
        if (stored) {
          const parsed = JSON.parse(stored);
          basketId = parsed.state?.basketId || null;
          console.log('[Global SSE] localStorage에서 basketId 가져옴:', basketId);
        }
      } catch (e) {
        console.error('[Global SSE] localStorage 파싱 실패:', e);
      }
    }
    
    // 3. 토큰 가져오기
    token = authStorage.getAccessToken();
    
  } catch (error) {
    console.error('[Global SSE] 상태 가져오기 실패:', error);
  }
  
  console.log('[Global SSE] 재연결 시도 - basketId:', basketId, 'hasToken:', !!token);
  
  if (basketId && token) {
    setTimeout(() => {
      connectGlobalSSE(basketId, token);
    }, 1000); // 1초 후 재연결
  } else {
    console.warn('[Global SSE] 재연결 조건 불충족 - basketId:', basketId, 'hasToken:', !!token);
  }
} 