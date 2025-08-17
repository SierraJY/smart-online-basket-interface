'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/utils/hooks/useAuth';
import { authStorage } from '@/utils/storage';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { isGuestUser } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

      // 1시간 이하로 남으면 경고 표시
      setIsExpiringSoon(timeRemaining <= 3600);

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

  // 게스트는 최초 노출 시 말풍선이 보이도록
  useEffect(() => {
    if (isGuestUser) setIsExpanded(true);
  }, [isGuestUser]);

  if (!isGuestUser) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50">
      {/* 토글 버튼 (아이콘 제거, 토글 트랙/노브 UI) */}
      <motion.button
        onClick={() => setIsExpanded(prev => !prev)}
        aria-pressed={isExpanded}
        className="w-[44px] h-[24px] rounded-full shadow-sm flex items-center relative focus:outline-none"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        style={{
          background: isExpanded ? 'var(--guest-orange)' : 'var(--footer-border)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.12)'
        }}
      >
        <motion.span
          className="absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full"
          style={{ background: 'white' }}
          animate={{ x: isExpanded ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        />
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-full right-0 mb-3 px-4 py-3 rounded-2xl text-sm font-medium whitespace-nowrap"
            style={{
              background: 'var(--footer-background)',
              border: '1px solid var(--footer-border)',
              backdropFilter: 'blur(10px) saturate(140%)',
              color: 'var(--foreground)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)'
            }}
          >
            {/* 말풍선 꼬리 */}
            <div 
              className="absolute top-full right-4 w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: `8px solid var(--footer-background)`,
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
              }}
            />
            
            <div className="text-center">
              <div className="text-xs opacity-70 mb-1">Guest Session</div>
              <div className={`font-semibold ${isExpiringSoon ? 'text-red-500' : ''}`}>
                {isExpiringSoon ? '만료 예정' : '남은 시간'}: {timeLeft}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
