'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/utils/hooks/useAuth';
import { authStorage } from '@/utils/storage';

// JWT 토큰 디코딩 함수
function decodeJWT(token: string) {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const base64Url = parts[1];
    if (!base64Url) {
      return null;
    }
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[GuestTimeOut] JWT 디코딩 실패:', error);
    return null;
  }
}

export default function GuestTimeOut() {
  const { isGuestUser, isLoggedIn } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    if (!isGuestUser) return;

    const updateTimeLeft = () => {
      const token = authStorage.getAccessToken();
      if (!token) return;

      const decoded = decodeJWT(token);
      if (!decoded || !decoded.exp) return;

      const currentTime = Math.floor(Date.now() / 1000);
      const timeRemaining = decoded.exp - currentTime;

      if (timeRemaining <= 0) {
        setTimeLeft('만료됨');
        setIsExpiringSoon(true);
        return;
      }

      // 10분 이하로 남으면 경고 표시
      setIsExpiringSoon(timeRemaining <= 600);

      const hours = Math.floor(timeRemaining / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      const seconds = timeRemaining % 60;

      if (hours > 0) {
        setTimeLeft(`${hours}시간 ${minutes}분`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}분 ${seconds}초`);
      } else {
        setTimeLeft(`${seconds}초`);
      }
    };

    // 초기 실행
    updateTimeLeft();

    // 1초마다 업데이트
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [isGuestUser]);

  if (!isGuestUser) return null;

  return (
    <div 
      className={`fixed top-14 left-4 z-50 px-3 py-2 rounded-lg text-[15px] font-medium shadow-lg transition-all duration-300 ${
        isExpiringSoon 
          ? 'bg-red-500 text-white animate-pulse' 
          : 'bg-[#121212] text-white'
      }`}
      style={{
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
    >
      <div className="flex items-center gap-2">
        <span>게스트 세션</span>
      </div>
      <div className="text-[13px] mt-1 opacity-90">
        {isExpiringSoon ? '만료 예정' : '남은 시간'}: {timeLeft}
      </div>
    </div>
  );
}
