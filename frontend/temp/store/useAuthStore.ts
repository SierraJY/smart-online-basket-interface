import { create } from 'zustand'

type AuthState = {
  isLoggedIn: boolean
  userId: string
  accessToken: string
  refreshToken: string
  setIsLoggedIn: (v: boolean) => void
  setUserId: (v: string) => void
  setAccessToken: (v: string) => void
  setRefreshToken: (v: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  userId: '',
  accessToken: '',
  refreshToken: '',
  setIsLoggedIn: (v) => set({ isLoggedIn: v }),
  setUserId: (v) => set({ userId: v }),
  setAccessToken: (v) => set({ accessToken: v }),
  setRefreshToken: (v) => set({ refreshToken: v }),
  logout: () =>
    set({
      isLoggedIn: false,
      userId: '',
      accessToken: '',
      refreshToken: '',
    }),
}))
