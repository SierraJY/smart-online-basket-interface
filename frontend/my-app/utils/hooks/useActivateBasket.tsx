import { useMutation } from '@tanstack/react-query';
import { useBasketStore } from '@/store/useBasketStore';

export function useActivateBasket(basketId: string | null, token: string | null) {
  const setActivatedBasketId = useBasketStore(s => s.setActivatedBasketId);
  
  return useMutation({
    mutationFn: async () => {
      if (!basketId || !token) throw new Error("정보 부족!");
      const res = await fetch(`/api/baskets/start/${basketId}`, {
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
      setActivatedBasketId(basketId);
      return true;
    },
  });
}
