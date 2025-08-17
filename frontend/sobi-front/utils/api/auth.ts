import { config } from '@/config/env';
import { apiClient } from './apiClient';

// 로그인 API
export async function loginApi({ userId, userPasswd }: { userId: string; userPasswd: string }) {
  const res = await apiClient.post(config.API_ENDPOINTS.CUSTOMERS_LOGIN, { userId, userPasswd }, false);
  if (!res.ok) throw new Error("로그인 실패");
  return await res.json();
}

// 게스트 로그인 API
export async function guestLoginApi() {
  const res = await apiClient.post(config.API_ENDPOINTS.CUSTOMERS_GUEST_LOGIN, {}, false);
  if (!res.ok) throw new Error("게스트 로그인 실패");
  return await res.json();
}

// 회원가입 API
export async function signupApi({ userId, password, gender, age }: { userId: string; password: string; gender: number; age: number }) {
  const res = await apiClient.post(config.API_ENDPOINTS.CUSTOMERS_SIGNUP, { userId, password, gender, age }, false);
  if (!res.ok) throw new Error("회원가입 실패");
  return await res.json();
}

// 회원정보 조회 API
export async function fetchMe() {
  const res = await apiClient.get(config.API_ENDPOINTS.CUSTOMERS_PROFILE);
  if (!res.ok) throw new Error("회원정보 조회 실패");
  return await res.json();
}

// 로그아웃 API
export async function logoutApi() {
  const res = await apiClient.get(config.API_ENDPOINTS.CUSTOMERS_LOGOUT);
  
  if (!res.ok) {
    throw new Error("로그아웃 실패");
  }
  
  return await res.json();
}

// accessToken 리프레시
export async function refreshToken(refreshToken: string) {
  try {
    const res = await apiClient.post(config.API_ENDPOINTS.AUTH_REFRESH, { refreshToken }, false);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('[auth] 토큰 갱신 실패:', res.status, errorData);
      
      if (res.status === 401) {
        throw new Error("리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.");
      } else if (res.status === 400) {
        throw new Error("잘못된 리프레시 토큰입니다.");
      } else {
        throw new Error(`토큰 갱신 실패 (${res.status})`);
      }
    }
    
    const data = await res.json();
    console.log('[auth] 토큰 갱신 성공:', data);
    
    // 백엔드 응답: { accessToken, userId, customerId, message }
    return { 
      accessToken: data.accessToken,
      userId: data.userId,
      customerId: data.customerId
    };
  } catch (error) {
    console.error('[auth] 토큰 갱신 중 오류:', error);
    throw error;
  }
}
