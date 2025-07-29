import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isLoggedIn: boolean
  userId: string
  accessToken: string | null
  refreshToken: string
  favorite: number[]; // 찜 목록 id 배열로 예시 (상품 id 타입 맞게)
  setFavorite: (arr: number[]) => void; // arr 타입도 맞게!
  setIsLoggedIn: (value: boolean) => void
  setUserId: (id: string) => void
  setAccessToken: (token: string) => void
  setRefreshToken: (token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userId: '',
      accessToken: '',
      refreshToken: '',
      favorite: [], // <-- 추가!
      setFavorite: (arr) => set({ favorite: arr }), // <-- 추가!
      setIsLoggedIn: (value) => set({ isLoggedIn: value }),
      setUserId: (id) => set({ userId: id }),
      setAccessToken: (token) => set({ accessToken: token }),
      setRefreshToken: (token) => set({ refreshToken: token }),
      clearAuth: () =>
        set({
          isLoggedIn: false,
          userId: '',
          accessToken: '',
          refreshToken: '',
        }),
    }),
    {
      name: 'auth-storage', // localStorage 키 이름
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        userId: state.userId,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
