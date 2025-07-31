// useAuth.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from 'react';
import { useBasketStore } from '@/store/useBasketStore';

// ----- fetch 함수들 -----
async function loginApi({ userId, userPasswd }: { userId: string; userPasswd: string }) {
  const res = await fetch("/api/customers/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, userPasswd }),
  });
  if (!res.ok) throw new Error("로그인 실패");
  return await res.json(); // { accessToken, refreshToken, userId, ... }
}

async function signupApi({ userId, password, gender, age }: { userId: string; password: string; gender: number; age: number }) {
  const res = await fetch("/api/customers/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password, gender, age }),
  });
  if (!res.ok) throw new Error("회원가입 실패");
  return await res.json();
}

async function refreshTokenApi(refreshToken: string) {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("토큰 갱신 실패");
  return await res.json(); // { accessToken, ... }
}

function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}
function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}
function getUserId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userId');
}

export function useAuth() {
  const queryClient = useQueryClient();

  // "실시간" 동기화용 마운트 + 상태
  const [mounted, setMounted] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // 초기화 + storage/커스텀 이벤트 리스너
  useEffect(() => {
    setAccessToken(getAccessToken());
    setRefreshToken(getRefreshToken());
    setUserId(getUserId());
    setMounted(true);

    // localStorage 직접 변경(다른 탭 등)도 반영
    const sync = () => {
      setAccessToken(getAccessToken());
      setRefreshToken(getRefreshToken());
      setUserId(getUserId());
    }
    window.addEventListener('storage', sync);
    // 커스텀 이벤트(로그인/아웃 시 강제갱신)도 반영
    window.addEventListener('authChanged', sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('authChanged', sync);
    }
  }, []);

  // 로그인
  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("userId", data.userId);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUserId(data.userId);
      // 커스텀 이벤트로 다른 곳 강제 갱신
      window.dispatchEvent(new Event("authChanged"));
    },
  });

  // 회원가입
  const signupMutation = useMutation({
    mutationFn: signupApi,
    onSuccess: (data) => {
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("userId", data.userId);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUserId(data.userId);
      window.dispatchEvent(new Event("authChanged"));
    },
  });

  // 로그아웃
  const logout = () => {
    // 인증 관련 데이터 삭제
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
    setAccessToken(null);
    setRefreshToken(null);
    setUserId(null);
    
    // 장바구니 관련 데이터 삭제
    const clearBasketId = useBasketStore.getState().clearBasketId;
    const clearBasketData = useBasketStore.getState().clearBasketData;
    clearBasketId();  // basketId, activatedBasketId 초기화
    clearBasketData(); // basketData 초기화
    
    // localStorage에서 basket-storage도 직접 삭제
    localStorage.removeItem("basket-storage");
    
    window.dispatchEvent(new Event("authChanged"));
  };

  // 토큰 리프레시 (수동)
  const refreshAccessToken = async () => {
    if (!refreshToken) throw new Error("리프레시 토큰 없음");
    const data = await refreshTokenApi(refreshToken);
    localStorage.setItem("accessToken", data.accessToken);
    setAccessToken(data.accessToken);
    window.dispatchEvent(new Event("authChanged"));
    return data.accessToken;
  };

  // 핵심: isLoggedIn은 localStorage와 상태 모두로 체크
  const isLoggedIn =
    (typeof window !== 'undefined'
      ? !!localStorage.getItem('accessToken')
      : !!accessToken
    ) || !!accessToken;

  // 디버깅 로그(선택)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[useAuth] accessToken:', accessToken);
      console.log('[useAuth] userId:', userId);
      console.log('[useAuth] isLoggedIn:', isLoggedIn);
    }
  }, [accessToken, userId]);

  return {
    isLoggedIn,
    userId,
    accessToken,
    mounted,
    login: loginMutation.mutateAsync,
    loginLoading: loginMutation.isPending,
    loginError: loginMutation.error,
    signup: signupMutation.mutateAsync,
    signupLoading: signupMutation.isPending,
    signupError: signupMutation.error,
    logout,
    refreshAccessToken,
  };
}



