// API 클라이언트 - 토큰 자동 갱신 기능 포함
import { authStorage } from '@/utils/storage';
import { config } from '@/config/env';

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
    console.error('[ApiClient] JWT 디코딩 실패:', error);
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

// 토큰 갱신 함수
async function refreshTokenApi(refreshToken: string) {
  const res = await fetch(config.API_ENDPOINTS.AUTH_REFRESH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("토큰 갱신 실패");
  return await res.json();
}

// 토큰 갱신 중인지 체크하는 플래그
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// API 요청 래퍼
export async function apiRequest(
  url: string, 
  options: RequestInit = {}, 
  requireAuth: boolean = true
): Promise<Response> {
  
  // 인증이 필요한 요청인 경우 토큰 추가
  if (requireAuth) {
    const accessToken = authStorage.getAccessToken();
    const refreshToken = authStorage.getRefreshToken();
    
    if (!accessToken) {
      throw new Error("인증 토큰이 없습니다. 로그인이 필요합니다.");
    }
    
    // 토큰이 만료되었는지 체크
    if (isTokenExpired(accessToken)) {
      if (!refreshToken) {
        throw new Error("리프레시 토큰이 없습니다. 다시 로그인해주세요.");
      }
      
      // 이미 갱신 중인 경우 기존 Promise 대기
      if (isRefreshing && refreshPromise) {
        try {
          await refreshPromise;
        } catch (error) {
          throw new Error("토큰 갱신에 실패했습니다. 다시 로그인해주세요.");
        }
      } else {
        // 새로운 토큰 갱신 시작
        isRefreshing = true;
        refreshPromise = refreshTokenApi(refreshToken).then((data: any) => {
          authStorage.setAccessToken(data.accessToken);
          return data.accessToken;
        }).finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
        
        try {
          await refreshPromise;
        } catch (error) {
          throw new Error("토큰 갱신에 실패했습니다. 다시 로그인해주세요.");
        }
      }
    }
    
    // 최신 토큰으로 헤더 설정
    const currentToken = authStorage.getAccessToken();
    if (currentToken) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${currentToken}`,
      };
    }
  }
  
  // API 요청 실행
  const response = await fetch(url, options);
  
  // 401 에러 발생 시 토큰 갱신 시도
  if (response.status === 401 && requireAuth) {
    const refreshToken = authStorage.getRefreshToken();
    
    if (refreshToken && !isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshTokenApi(refreshToken).then((data: any) => {
        authStorage.setAccessToken(data.accessToken);
        return data.accessToken;
      }).finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
      
      try {
        await refreshPromise;
        
        // 새로운 토큰으로 재요청
        const newToken = authStorage.getAccessToken();
        if (newToken) {
          const newOptions = {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${newToken}`,
            },
          };
          return await fetch(url, newOptions);
        }
      } catch (error) {
        // 토큰 갱신 실패 시 로그아웃 처리
        authStorage.clear();
        window.dispatchEvent(new Event("authChanged"));
        throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
      }
    }
  }
  
  return response;
}

// 편의 함수들
export const apiClient = {
  get: (url: string, requireAuth: boolean = true) => 
    apiRequest(url, { method: 'GET' }, requireAuth),
    
  post: (url: string, data?: any, requireAuth: boolean = true) => 
    apiRequest(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined 
    }, requireAuth),
    
  put: (url: string, data?: any, requireAuth: boolean = true) => 
    apiRequest(url, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined 
    }, requireAuth),
    
  delete: (url: string, requireAuth: boolean = true) => 
    apiRequest(url, { method: 'DELETE' }, requireAuth),
}; 