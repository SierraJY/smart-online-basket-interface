'use client';

import { useEffect, useRef } from 'react';
import { useBasketStore } from '@/store/useBasketStore';
import { usePushNotification } from '@/utils/hooks/usePushNotification';
import '@/utils/polyfills';

export const ServiceWorkerProvider = () => {
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);
  const setBasketData = useBasketStore(s => s.setBasketData);
  const { pushToken, isSupported: pushSupported } = usePushNotification();

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
              // 전역 상태 업데이트
              setBasketData(event.data.basketData);
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
  }, [setBasketData]);

  // 장바구니 데이터를 서비스 워커에 전송하는 함수 (전역으로 노출)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).sendBasketUpdateToSW = (basketData: any) => {
        if (swRegistration.current && swRegistration.current.active) {
          console.log('[SW] 장바구니 업데이트 전송:', basketData);
          swRegistration.current.active.postMessage({
            type: 'BASKET_UPDATE',
            basketData: basketData
          });
        }
      };
    }
  }, []);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}; 