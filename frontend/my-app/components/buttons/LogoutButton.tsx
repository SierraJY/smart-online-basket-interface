'use client'

import { LogOut } from "lucide-react";
import { useAuth } from '@/utils/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { logoutApi } from '@/utils/api/auth';
import ToastManager from '@/utils/toastManager';
import { useEffect } from 'react';

export default function LogoutButton() {
  const { logout, isLoggedIn, userId } = useAuth();
  const router = useRouter();

  // isLoggedIn 상태 변화 감지
  useEffect(() => {
    console.log('isLoggedIn 상태 변화:', isLoggedIn);
  }, [isLoggedIn]);

  const handleLogout = async () => {
    try {
      // 백엔드 로그아웃 API 호출
      const data = await logoutApi();
      
      if (data.success) {
        // 로컬 상태 정리
        await logout();
        
        // 성공 메시지 표시
        ToastManager.logoutSuccess(userId || undefined);
        
        // 로그인 페이지로 리다이렉트
        router.push('/login');
      } else {
        throw new Error(data.message || '로그아웃 처리 중 오류가 발생했습니다.');
      }
      
    } catch (error) {
      console.error('로그아웃 오류:', error);
      ToastManager.logoutError();
      
      // 오류가 발생해도 로컬 상태는 정리
      try {
        await logout();
        router.push('/login');
      } catch (localError) {
        console.error('로컬 상태 정리 오류:', localError);
      }
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="p-3 rounded-full shadow-sm bg-white/60 hover:scale-110 transition-all backdrop-blur-sm"
      title="로그아웃"
    >
      <LogOut size={25} color="var(--foreground)" />
    </button>
  );
}