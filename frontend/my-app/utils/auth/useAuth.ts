import { useAuthStore } from '@/store/useAuthStore'
import { logoutApi, refreshTokenApi } from '@/utils/api/auth'
import { setToken, removeToken } from '@/utils/auth/authUtils'

export function useAuth() {
  const {
    isLoggedIn,
    accessToken,
    userId,
    refreshToken,
    setIsLoggedIn,
    setAccessToken,
    setRefreshToken,
    setUserId,
    resetAuth,
  } = useAuthStore();

  // 토큰 갱신
  const refreshAccessToken = async () => {
    try {
      if (!refreshToken) throw new Error('리프레시 토큰 없음');
      const result = await refreshTokenApi(refreshToken);
      setAccessToken(result.accessToken);
      setToken(result.accessToken); // localStorage에도 반영
      // 필요하다면 userId/customerId도 저장 가능
      return result.accessToken;
    } catch (e) {
      // 실패 시 로그아웃 처리 등 추가 가능
      throw e;
    }
  };

  // 로그아웃: 백엔드 호출 + 상태초기화 + 로컬 토큰 삭제
  const logout = async () => {
    try {
      // 상태 초기화 전에 accessToken 값 보관
      const token = accessToken;
      console.log('액세스토큰(디버깅용):', token);
      if (token) {
        await logoutApi(token); // 토큰 헤더로 무조건 전달!
      }
    } catch (e) {
      // 실패시 무시 가능
    }
    resetAuth();
    removeToken();
  };

  // 로그인 후 상태/토큰 저장(참고용)
  const login = (token: string, userId: string) => {
    setIsLoggedIn(true);
    setAccessToken(token);
    setUserId(userId);
    setToken(token);
  };

  return {
    isLoggedIn,
    accessToken,
    userId,
    setIsLoggedIn,
    setAccessToken,
    refreshAccessToken,
    setUserId,
    login,
    logout,
  };
}