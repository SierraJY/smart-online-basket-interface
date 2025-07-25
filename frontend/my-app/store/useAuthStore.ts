import { create } from 'zustand'

interface AuthState {
  isLoggedIn: boolean
  email: string
  name: string
  wishlist: number[]

  setIsLoggedIn: (value: boolean) => void
  setEmail: (value: string) => void
  setName: (value: string) => void
  setWishlist: (list: number[]) => void
  
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  email: '',
  name: '',
  wishlist: [],

  setIsLoggedIn: (value) => set({ isLoggedIn: value }),
  setEmail: (value) => set({ email: value }),
  setName: (value) => set({ name: value }),
  setWishlist: (list) => set({ wishlist: list }),
}))