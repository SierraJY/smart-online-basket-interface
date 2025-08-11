'use client'

// useAuth.tsx
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from 'react';
import { useBasketStore } from '@/store/useBasketStore';
import { authStorage } from '@/utils/storage';
import { loginApi, signupApi, guestLoginApi, refreshToken as refreshTokenApi } from '@/utils/api/auth';

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
    console.error('[useAuth] JWT 디코딩 실패:', error);
    return null;
  }
}

// 토큰 만료 체크 함수
function isTokenExpired(token: string): boolean {
  if (!token || typeof token !== 'string') return true;
  
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

// 토큰 만료까지 남은 시간 계산 (밀리초)
function getTokenExpiryTime(token: string): number {
  if (!token || typeof token !== 'string') return 0;
  
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return 0;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return (decoded.exp - currentTime) * 1000; // 밀리초로 변환
}

export function useAuth() {

  // "실시간" 동기화용 마운트 + 상태
  const [mounted, setMounted] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null); // 회원가입 후 자동 로그인용
  const [isGuestUser, setIsGuestUser] = useState<boolean>(false); // 게스트 사용자 여부

  // 토큰 자동 갱신 함수
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken || isRefreshing) {
      throw new Error("리프레시 토큰이 없거나 이미 갱신 중입니다");
    }
    
    setIsRefreshing(true);
    try {
      const data = await refreshTokenApi(refreshToken);
      
      // 새로운 accessToken 저장
      authStorage.setAccessToken(data.accessToken);
      setAccessToken(data.accessToken);
      
      // 새로운 userId가 있다면 저장
      if (data.userId) {
        authStorage.setUserId(data.userId);
        setUserId(data.userId);
      }
      
      window.dispatchEvent(new Event("authChanged"));
      console.log('[useAuth] 토큰 자동 갱신 성공');
      return data.accessToken;
    } catch (error) {
      console.error('[useAuth] 토큰 갱신 실패:', error);
      // 갱신 실패 시 로그아웃
      logout();
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshToken, isRefreshing]);

  // 토큰 자동 갱신 스케줄러
  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const scheduleTokenRefresh = () => {
      const expiryTime = getTokenExpiryTime(accessToken);
      
      if (expiryTime <= 0) {
        // 토큰이 이미 만료된 경우 즉시 갱신
        refreshAccessToken().catch(console.error);
        return;
      }
      
      // 토큰 만료 5분 전에 갱신
      const refreshTime = Math.max(expiryTime - 5 * 60 * 1000, 0);
      
      console.log(`[useAuth] 토큰 만료까지 ${Math.round(expiryTime / 1000 / 60)}분, ${Math.round(refreshTime / 1000 / 60)}분 후 갱신 예정`);
      
      timeoutId = setTimeout(() => {
        refreshAccessToken().catch(console.error);
      }, refreshTime);
    };

    scheduleTokenRefresh();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }, [accessToken, refreshToken, isRefreshing, refreshAccessToken]); // isRefreshing 추가

  // 초기화 + storage/커스텀 이벤트 리스너
  useEffect(() => {
    const storedAccessToken = authStorage.getAccessToken();
    const storedRefreshToken = authStorage.getRefreshToken();
    const storedUserId = authStorage.getUserId();
    const storedIsGuestUser = authStorage.isGuestUser();
    
    // 저장된 토큰이 있고 만료되지 않았다면 사용
    if (storedAccessToken && !isTokenExpired(storedAccessToken)) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setUserId(storedUserId);
      // 게스트 사용자 상태도 로드
      setIsGuestUser(storedIsGuestUser);
    } else if (storedRefreshToken && !isTokenExpired(storedRefreshToken)) {
      // Access token이 만료되었지만 refresh token이 유효한 경우 자동 갱신
      setRefreshToken(storedRefreshToken);
      setUserId(storedUserId);
      setIsGuestUser(storedIsGuestUser);
      refreshAccessToken().catch(console.error);
    } else {
      // 모든 토큰이 만료되었거나 유효하지 않은 경우 로그아웃 상태로 설정
      if (storedAccessToken || storedRefreshToken) {
        authStorage.clear();
      }
      setIsGuestUser(false);
    }
    
    setMounted(true);

    // localStorage 직접 변경(다른 탭 등)도 반영
    const sync = () => {
      const newAccessToken = authStorage.getAccessToken();
      const newRefreshToken = authStorage.getRefreshToken();
      const newUserId = authStorage.getUserId();
      const newIsGuestUser = authStorage.isGuestUser();
      
      if (newAccessToken && !isTokenExpired(newAccessToken)) {
        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);
        setUserId(newUserId);
        setIsGuestUser(newIsGuestUser);
      } else {
        // 토큰이 없으면 모든 상태 초기화
        setAccessToken(null);
        setRefreshToken(null);
        setUserId(null);
        setIsGuestUser(false);
      }
    }
    window.addEventListener('storage', sync);
    // 커스텀 이벤트(로그인/아웃 시 강제갱신)도 반영
    window.addEventListener('authChanged', sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('authChanged', sync);
    }
  }, [refreshAccessToken]);

  // 로그인
  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      // 백엔드 응답: { accessToken, refreshToken, userId, customerId }
      authStorage.setAccessToken(data.accessToken);
      authStorage.setRefreshToken(data.refreshToken);
      authStorage.setUserId(data.userId);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUserId(data.userId);
      
      // 커스텀 이벤트로 다른 곳 강제 갱신
      window.dispatchEvent(new Event("authChanged"));
    },
  });

  // 게스트 로그인 mutation
  const guestLoginMutation = useMutation({
    mutationFn: guestLoginApi,
    onSuccess: (data) => {
      // 게스트 로그인 성공 시 토큰 저장 (refreshToken 없음)
      authStorage.setAccessToken(data.accessToken);
      authStorage.setUserId(data.userId);
      setAccessToken(data.accessToken);
      setUserId(data.userId);
      // 게스트 사용자임을 표시
      authStorage.setGuestUser(true);
      setIsGuestUser(true);
      
      window.dispatchEvent(new Event("authChanged"));
    },
  });

  // 회원가입
  const signupMutation = useMutation({
    mutationFn: signupApi,
    onSuccess: async (data) => {
      // 백엔드 응답: { userId } (토큰 없음)
      // 회원가입 후 자동 로그인 처리
      if (tempPassword) {
        try {
          // 회원가입 성공 후 자동 로그인
          const loginData = await loginApi({ 
            userId: data.userId, 
            userPasswd: tempPassword 
          });
          
          // 로그인 성공 시 토큰 저장 (올바른 백엔드 응답 필드명 사용)
          authStorage.setAccessToken(loginData.accessToken);
          authStorage.setRefreshToken(loginData.refreshToken);
          authStorage.setUserId(loginData.userId);
          setAccessToken(loginData.accessToken);
          setRefreshToken(loginData.refreshToken);
          setUserId(loginData.userId);
          setTempPassword(null); // 임시 비밀번호 삭제
          window.dispatchEvent(new Event("authChanged"));
        } catch (error) {
          console.error('[useAuth] 회원가입 후 자동 로그인 실패:', error);
          // 자동 로그인 실패 시에도 회원가입은 성공으로 처리
          authStorage.setUserId(data.userId);
          setUserId(data.userId);
          setTempPassword(null); // 임시 비밀번호 삭제
        }
      } else {
        // 임시 비밀번호가 없는 경우 (일반적인 경우)
        authStorage.setUserId(data.userId);
        setUserId(data.userId);
      }
    },
  });

  // 회원가입 함수 (비밀번호 임시 저장 포함)
  const signup = async (signupData: { userId: string; password: string; gender: number; age: number }) => {
    setTempPassword(signupData.password); // 비밀번호 임시 저장
    return signupMutation.mutateAsync(signupData);
  };

  // 로그아웃
  const logout = () => {
    // 인증 관련 데이터 삭제
    authStorage.clear();
    setAccessToken(null);
    setRefreshToken(null);
    setUserId(null);
    setTempPassword(null); // 임시 비밀번호도 삭제
    setIsGuestUser(false); // 게스트 사용자 상태도 초기화
    
    // 장바구니 관련 데이터 삭제
    const clearBasketId = useBasketStore.getState().clearBasketId;
    const clearBasketData = useBasketStore.getState().clearBasketData;
    clearBasketId();  // basketId, activatedBasketId 초기화
    clearBasketData(); // basketData 초기화
    
    // localStorage에서 basket-storage도 직접 삭제
    localStorage.removeItem("basket-storage");
    
    // 상태 변경 이벤트 발생
    window.dispatchEvent(new Event("authChanged"));
  };

  // 핵심: isLoggedIn은 localStorage와 상태 모두로 체크
  const isLoggedIn =
    (typeof window !== 'undefined'
      ? authStorage.isLoggedIn() && !isTokenExpired(authStorage.getAccessToken() || '')
      : !!accessToken && !isTokenExpired(accessToken)
    ) || (!!accessToken && !isTokenExpired(accessToken));

  // 디버깅 로그(선택)
  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     console.log('[useAuth] accessToken:', accessToken);
  //     console.log('[useAuth] userId:', userId);
  //     console.log('[useAuth] isLoggedIn:', isLoggedIn);
  //   }
  // }, [accessToken, userId]);

  return {
    isLoggedIn,
    userId,
    accessToken,
    refreshToken,
    mounted,
    isRefreshing,
    isGuestUser,
    loginMutation,
    login: loginMutation.mutateAsync,
    loginLoading: loginMutation.isPending,
    loginError: loginMutation.error,
    guestLoginMutation,
    guestLogin: guestLoginMutation.mutateAsync,
    guestLoginLoading: guestLoginMutation.isPending,
    guestLoginError: guestLoginMutation.error,
    signupMutation,
    signup, // 새로운 signup 함수 추가
    signupLoading: signupMutation.isPending,
    signupError: signupMutation.error,
    logout,
    refreshAccessToken,
  };
}



