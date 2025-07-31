import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export const usePushNotification = () => {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const { accessToken } = useAuth();

  useEffect(() => {
    const initializePushNotification = async () => {
      // 푸시 알림 지원 확인
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('[Push] 푸시 알림을 지원하지 않습니다.');
        return;
      }

      // 임시로 푸시 알림 비활성화 (VAPID 키 준비 후 활성화)
      console.log('[Push] 푸시 알림 기능이 임시로 비활성화되었습니다. (VAPID 키 필요)');
      return;
      setIsSupported(true);

      try {
        // 서비스 워커 등록
        const registration = await navigator.serviceWorker.ready;
        
        // 알림 권한 요청
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('[Push] 알림 권한이 거부되었습니다.');
          return;
        }

        // 푸시 구독 생성 (VAPID 키가 준비되면 활성화)
        // const subscription = await registration.pushManager.subscribe({
        //   userVisibleOnly: true,
        //   applicationServerKey: urlBase64ToUint8Array(
        //     'YOUR_VAPID_PUBLIC_KEY' // 백엔드에서 제공하는 VAPID 공개키
        //   )
        // });

        // 임시로 더미 토큰 생성
        const subscription = {
          toJSON: () => ({ endpoint: 'dummy-endpoint', keys: { p256dh: 'dummy-p256dh', auth: 'dummy-auth' } })
        };

        const token = JSON.stringify(subscription);
        setPushToken(token);
        console.log('[Push] 푸시 토큰 생성:', token);

        // 백엔드에 푸시 토큰 등록
        await registerPushToken(token);

      } catch (error) {
        console.error('[Push] 푸시 알림 초기화 실패:', error);
      }
    };

    initializePushNotification();
  }, [accessToken]);

  // 백엔드에 푸시 토큰 등록
  const registerPushToken = async (token: string) => {
    if (!accessToken) return;

    try {
      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ pushToken: token })
      });

      if (response.ok) {
        console.log('[Push] 푸시 토큰 등록 성공');
      } else {
        console.error('[Push] 푸시 토큰 등록 실패:', response.status);
      }
    } catch (error) {
      console.error('[Push] 푸시 토큰 등록 에러:', error);
    }
  };

  // VAPID 공개키를 Uint8Array로 변환
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return {
    pushToken,
    isSupported,
    registerPushToken
  };
}; 