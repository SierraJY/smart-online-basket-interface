import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { config } from '@/config/env';

export const usePushNotification = () => {
  const [pushToken] = useState<string | null>(null);
  const [isSupported] = useState(false);
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
    };

    initializePushNotification();
  }, [accessToken]);

  // 백엔드에 푸시 토큰 등록
  const registerPushToken = useCallback(async (token: string) => {
    if (!accessToken) return;

    try {
      const response = await fetch(config.API_ENDPOINTS.PUSH_REGISTER, {
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
  }, [accessToken]);

  return {
    pushToken,
    isSupported,
    registerPushToken
  };
}; 