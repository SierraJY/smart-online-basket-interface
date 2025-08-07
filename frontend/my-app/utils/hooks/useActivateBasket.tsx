import { useMutation } from '@tanstack/react-query';
import { useBasketStore } from '@/store/useBasketStore';
import { config } from '@/config/env';

export function useActivateBasket(basketId: string | null, token: string | null) {
  const setActivatedBasketId = useBasketStore(s => s.setActivatedBasketId);
  
  return useMutation({
    mutationFn: async () => {
      if (!basketId || !token) throw new Error("정보 부족!");
      const res = await fetch(`${config.API_ENDPOINTS.BASKET_START}/${basketId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const errorData = await res.text();
        console.error('장바구니 활성화 실패:', res.status, errorData);
        throw new Error(`장바구니 활성화 실패: ${res.status} - ${errorData}`);
      }
      console.log('[ActivateBasket] 활성화 성공 - basketId:', basketId);
      setActivatedBasketId(basketId);
      return true;
    },
  });
}
