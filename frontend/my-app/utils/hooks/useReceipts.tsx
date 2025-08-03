import { useQuery } from '@tanstack/react-query';
import { config } from '@/config/env';
import { apiClient } from '@/utils/api/apiClient';

interface Receipt {
  id: number;
  customerId: number;
  totalAmount: number;
  totalCount: number;
  items: ReceiptItem[];
  createdAt: string;
  updatedAt: string;
}

interface ReceiptItem {
  id: number;
  receiptId: number;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  totalPrice: number;
}

interface ReceiptsResponse {
  receipts: Receipt[];
  customerId: number;
  count: number;
  message: string;
}

async function fetchReceipts(): Promise<ReceiptsResponse> {
  const res = await apiClient.get(config.API_ENDPOINTS.RECEIPTS);
  
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('로그인이 필요합니다.');
    }
    throw new Error('구매기록 불러오기 실패');
  }
  
  return res.json();
}

export function useReceipts(token: string | null) {
  return useQuery({
    queryKey: ['receipts', token],
    queryFn: fetchReceipts,
    enabled: !!token,
    // 구매기록은 자주 변경되지 않으므로 긴 캐시 시간
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    // 에러 발생 시 재시도 설정
    retry: (failureCount: number, error: any) => {
      // 4xx 에러는 재시도하지 않음
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // 최대 2번까지만 재시도
      return failureCount < 2;
    },
  });
}

export type { Receipt, ReceiptItem, ReceiptsResponse }; 