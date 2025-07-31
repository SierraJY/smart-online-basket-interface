import { useEffect, useRef } from 'react';

export const useServiceWorker = () => {
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        try {
          console.log('[SW] 서비스 워커 등록 시작...');
          
          const registration = await navigator.serviceWorker.register('/basket-sync-sw.js', {
            scope: '/'
          });

          console.log('[SW] 서비스 워커 등록 성공:', registration);
          swRegistration.current = registration;

          // 서비스 워커 메시지 리스너
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('[SW] 클라이언트에서 메시지 수신:', event.data);
            
            if (event.data.type === 'BASKET_SYNC_UPDATE') {
              // 전역 상태 업데이트 (Zustand store)
              if (typeof window !== 'undefined' && window.basketStore) {
                window.basketStore.setBasketData(event.data.basketData);
              }
            }
          });

          // 푸시 알림 권한 요청
          if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log('[SW] 푸시 알림 권한:', permission);
          }

        } catch (error) {
          console.error('[SW] 서비스 워커 등록 실패:', error);
        }
      } else {
        console.warn('[SW] 서비스 워커 또는 백그라운드 동기화를 지원하지 않습니다.');
      }
    };

    registerServiceWorker();

    return () => {
      // 정리 작업
      if (swRegistration.current) {
        swRegistration.current.unregister();
      }
    };
  }, []);

  // 장바구니 데이터를 서비스 워커에 전송하는 함수
  const sendBasketUpdate = (basketData: any) => {
    if (swRegistration.current && swRegistration.current.active) {
      console.log('[SW] 장바구니 업데이트 전송:', basketData);
      swRegistration.current.active.postMessage({
        type: 'BASKET_UPDATE',
        basketData: basketData
      });
    }
  };

  // 백그라운드 동기화 수동 등록
  const registerBackgroundSync = async () => {
    if (swRegistration.current && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await swRegistration.current.sync.register('basket-sync');
        console.log('[SW] 백그라운드 동기화 등록 성공');
      } catch (error) {
        console.error('[SW] 백그라운드 동기화 등록 실패:', error);
      }
    }
  };

  return {
    sendBasketUpdate,
    registerBackgroundSync,
    isSupported: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
  };
}; 