import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

// 백엔드 SSE 명세서에 맞는 타입 정의
interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string;
  discountRate: number;
  sales: number;
  tag: string;
  location: string | null;
  description: string | null;
  brand: string | null;
  discountedPrice: number;
}

interface BasketItem {
  epcPattern: string;
  quantity: number;
  product: Product | null; // product가 null일 수 있음
  totalPrice: number;
}

interface BasketData {
  items: BasketItem[];
  totalPrice: number;
  totalCount: number; // 백엔드 명세에 맞게 itemCount -> totalCount
  boardMac: string;
  timestamp: number;
}

interface BasketState {
  basketId: string;
  activatedBasketId: string | null;
  basketData: BasketData | null;
  setBasketId: (basketId: string) => void;
  setActivatedBasketId: (basketId: string | null) => void;
  setBasketData: (data: BasketData | null) => void;
  clearBasketId: () => void;
  clearBasketData: () => void;
  // 최적화된 selector들
  getBasketId: () => string;
  getActivatedBasketId: () => string | null;
  getBasketData: () => BasketData | null;
  getBasketItems: () => BasketItem[];
  getBasketItemCount: () => number;
  getBasketTotalPrice: () => number;
  isBasketEmpty: () => boolean;
  hasActivatedBasket: () => boolean;
}

export const useBasketStore = create<BasketState>()(
  persist(
    (set, get) => ({
      basketId: "",
      activatedBasketId: null,
      basketData: null,
      
      // 액션들
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
      
      // 최적화된 selector들
      getBasketId: () => get().basketId,
      getActivatedBasketId: () => get().activatedBasketId,
      getBasketData: () => get().basketData,
      getBasketItems: () => get().basketData?.items || [],
      getBasketItemCount: () => get().basketData?.totalCount || 0, // totalCount 사용
      getBasketTotalPrice: () => get().basketData?.totalPrice || 0,
      isBasketEmpty: () => {
        const basketData = get().basketData;
        return !basketData || basketData.totalCount === 0; // totalCount 사용
      },
      hasActivatedBasket: () => !!get().activatedBasketId,
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

// 최적화된 훅들 - 컴포넌트에서 사용
export const useBasketId = () => useBasketStore(state => state.basketId);
export const useActivatedBasketId = () => useBasketStore(state => state.activatedBasketId);
export const useBasketData = () => useBasketStore(state => state.basketData);
export const useBasketItems = () => useBasketStore(state => state.basketData?.items || []);
export const useBasketItemCount = () => useBasketStore(state => state.basketData?.totalCount || 0); // totalCount 사용
export const useBasketTotalPrice = () => useBasketStore(state => state.basketData?.totalPrice || 0);
export const useIsBasketEmpty = () => useBasketStore(state => {
  const basketData = state.basketData;
  return !basketData || basketData.totalCount === 0; // totalCount 사용
});
export const useHasActivatedBasket = () => useBasketStore(state => !!state.activatedBasketId);

// 액션 훅들
export const useBasketActions = () => useBasketStore(
  state => ({
    setBasketId: state.setBasketId,
    setActivatedBasketId: state.setActivatedBasketId,
    setBasketData: state.setBasketData,
    clearBasketId: state.clearBasketId,
    clearBasketData: state.clearBasketData,
  })
);

// 복합 selector 훅
export const useBasketSummary = () => useBasketStore(
  state => ({
    basketId: state.basketId,
    activatedBasketId: state.activatedBasketId,
    itemCount: state.basketData?.totalCount || 0, // totalCount 사용
    totalPrice: state.basketData?.totalPrice || 0,
    isEmpty: !state.basketData || state.basketData.totalCount === 0, // totalCount 사용
    hasActivated: !!state.activatedBasketId,
  })
);
