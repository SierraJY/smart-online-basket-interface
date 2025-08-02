import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BasketState {
  basketId: string;
  activatedBasketId: string | null;
  basketData: any;
  setBasketId: (basketId: string) => void;
  setActivatedBasketId: (basketId: string | null) => void;
  setBasketData: (data: any) => void;
  clearBasketId: () => void;
  clearBasketData: () => void;
}

export const useBasketStore = create<BasketState>()(
  persist(
    (set) => ({
      basketId: "",
      activatedBasketId: null,
      basketData: null,
      setBasketId: (basketId) => {
        set({ basketId });
      },
      setActivatedBasketId: (basketId) => {
        set({ activatedBasketId: basketId });
      },
      setBasketData: (data) => {
        set({ basketData: data });
      },
      clearBasketId: () => {
        set({ basketId: "", activatedBasketId: null });
      },
      clearBasketData: () => {
        set({ basketData: null });
      },
    }),
    {
      name: 'basket-storage',
      // basketData는 실시간 데이터이므로 저장하지 않음
      partialize: (state) => ({ 
        basketId: state.basketId,
        activatedBasketId: state.activatedBasketId
      }),
    }
  )
);
