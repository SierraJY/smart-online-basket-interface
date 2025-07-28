import { create } from 'zustand';

type AuthState = {
  isLoggedIn: boolean;
  accessToken: string;
  refreshToken: string; // 추가!
  userId: string;
  favorite: number[];
  
  setIsLoggedIn: (v: boolean) => void;
  setAccessToken: (v: string) => void;
  setRefreshToken: (v: string) => void;
  setUserId: (v: string) => void;
  resetAuth: () => void;
  setFavorite: (ids: number[]) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  accessToken: '',
  refreshToken: '',
  userId: '',
  favorite: [],
  
  setIsLoggedIn: (v) => set({ isLoggedIn: v }),
  setAccessToken: (v) => set({ accessToken: v }),
  setRefreshToken: (v) => set({ refreshToken: v }),
  setUserId: (v) => set({ userId: v }),
  resetAuth: () =>
    set({
      isLoggedIn: false,
      accessToken: '',
      refreshToken: '',
      userId: '',
    }),
  setFavorite: (ids) => set({ favorite: ids }),
}));