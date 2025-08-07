'use client';

import { useEffect, useRef } from 'react';
import { useBasketStore } from '@/store/useBasketStore';
import { usePushNotification } from '@/utils/hooks/usePushNotification';
import '@/utils/polyfills';

export const ServiceWorkerProvider = () => {
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);
  const setBasketData = useBasketStore(s => s.setBasketData);

  useEffect(() => {
    const registerServiceWorker = async () => {
      // 개발 모드에서는 Service Worker 비활성화
      if (process.env.NODE_ENV === 'development') {
        console.log('[SW] 개발 모드 - Service Worker 비활성화');
        return;
      }
      
      if ('serviceWorker' in navigator) {
        try {
          console.log('[SW] 서비스 워커 등록 시작...');
          
          // Background Sync API 지원 여부 확인
          const isBackgroundSyncSupported = 'sync' in window.ServiceWorkerRegistration.prototype;
          console.log('[SW] Background Sync API 지원:', isBackgroundSyncSupported);
          
          // 서비스 워커 등록 전에 기존 등록 해제
          const existingRegistration = await navigator.serviceWorker.getRegistration();
          if (existingRegistration) {
            await existingRegistration.unregister();
            console.log('[SW] 기존 서비스 워커 해제됨');
          }
          
          const registration = await navigator.serviceWorker.register('/basket-sync-sw.js', {
            scope: '/',
            updateViaCache: 'none' // 캐시 문제 방지
          });

          console.log('[SW] 서비스 워커 등록 성공:', registration);
          swRegistration.current = registration;

          // 서비스 워커 업데이트 확인
          registration.addEventListener('updatefound', () => {
            console.log('[SW] 서비스 워커 업데이트 발견');
          });

          // 서비스 워커 메시지 리스너
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('[SW] 클라이언트에서 메시지 수신:', event.data);
            
            if (event.data.type === 'BASKET_SYNC_UPDATE') {
              try {
                // 전역 상태 업데이트
                setBasketData(event.data.basketData);
              } catch (error) {
                console.error('[SW] 상태 업데이트 실패:', error);
              }
            }
          });

          // 푸시 알림 권한 요청 (선택적)
          if ('Notification' in window && Notification.permission === 'default') {
            try {
              const permission = await Notification.requestPermission();
              console.log('[SW] 푸시 알림 권한:', permission);
            } catch (error) {
              console.error('[SW] 푸시 알림 권한 요청 실패:', error);
            }
          }

        } catch (error) {
          console.error('[SW] 서비스 워커 등록 실패:', error);
        }
      } else {
        console.warn('[SW] 서비스 워커를 지원하지 않습니다.');
      }
    };

    registerServiceWorker();

    return () => {
      // 정리 작업
      if (swRegistration.current) {
        try {
          swRegistration.current.unregister();
        } catch (error) {
          console.error('[SW] 서비스 워커 해제 실패:', error);
        }
      }
    };
  }, [setBasketData]);

  // 장바구니 데이터를 서비스 워커에 전송하는 함수 (전역으로 노출)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).sendBasketUpdateToSW = (basketData: any) => {
        // 개발 모드에서는 Service Worker 기능 비활성화
        if (process.env.NODE_ENV === 'development') {
          console.log('[SW] 개발 모드 - Service Worker 기능 비활성화');
          return;
        }
        
        if (swRegistration.current && swRegistration.current.active) {
          try {
            console.log('[SW] 장바구니 업데이트 전송:', basketData);
            
            // Background Sync API 지원 여부 확인
            const isBackgroundSyncSupported = 'sync' in window.ServiceWorkerRegistration.prototype;
            
            if (isBackgroundSyncSupported) {
              // Background Sync가 지원되는 경우
              swRegistration.current.active.postMessage({
                type: 'BASKET_UPDATE',
                basketData: basketData
              });
            } else {
              // Background Sync가 지원되지 않는 경우 즉시 동기화
              console.log('[SW] Background Sync 미지원 - 즉시 동기화 수행');
              swRegistration.current.active.postMessage({
                type: 'BASKET_UPDATE_IMMEDIATE',
                basketData: basketData
              });
            }
          } catch (error) {
            console.error('[SW] 장바구니 업데이트 전송 실패:', error);
          }
        }
      };
    }
  }, []);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}; 