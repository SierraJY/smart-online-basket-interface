import { useAuthStore } from '@/store/useAuthStore'
import { getToken, setToken, removeToken } from '@/utils/auth/authUtils'

export function useAuth() {
  const { isLoggedIn, userId, accessToken, refreshToken, setIsLoggedIn, setUserId, setAccessToken, setRefreshToken, logout } = useAuthStore()

  return {
    isLoggedIn,
    userId,
    accessToken,
    refreshToken,
    setIsLoggedIn,
    setUserId,
    setAccessToken,
    setRefreshToken,
    logout,
    getToken,
    setToken,
    removeToken,
  }
}
