import { useQuery } from '@tanstack/react-query';
import { config } from '@/config/env';
import { apiClient } from '@/utils/api/apiClient';

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
  location: string;
  description: string | null;
  brand: string;
  discountedPrice: number;
}

interface PurchasedProduct {
  product: Product;
  quantity: number;
}

interface Receipt {
  id: number;
  purchasedAt: string;
  purchasedProducts: PurchasedProduct[];
  // 계산된 필드들
  totalAmount?: number;
  totalCount?: number;
  totalProductTypes?: number;
  items?: ReceiptItem[];
}

interface ReceiptItem {
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  totalPrice: number;
  imageUrl: string;
}

interface ReceiptsResponse {
  receipts: Receipt[];
  customerId: number;
  count: number;
  message: string;
}

// 에러 타입 정의
interface ApiError {
  status?: number;
  message?: string;
  [key: string]: unknown;
}

async function fetchReceipts(): Promise<ReceiptsResponse> {
  const res = await apiClient.get(config.API_ENDPOINTS.RECEIPTS);
  
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('로그인이 필요합니다.');
    }
    throw new Error('구매기록 불러오기 실패');
  }
  
  const data = await res.json();
  console.log('=== /api/receipts/my API 응답 데이터 ===');
  console.log('전체 응답:', data);
  console.log('receipts 배열:', data.receipts);
  console.log('receipts 개수:', data.receipts?.length || 0);
  if (data.receipts && data.receipts.length > 0) {
    console.log('첫 번째 receipt:', data.receipts[0]);
    console.log('첫 번째 receipt의 purchasedProducts:', data.receipts[0].purchasedProducts);
  }
  console.log('=====================================');
  
  return data;
}

export function useReceipts(token: string | null) {
  return useQuery({
    queryKey: ['receipts', token],
    queryFn: fetchReceipts,
    enabled: !!token,
    // 구매내역은 자주 변경되지 않지만 결제 후 즉시 반영되어야 함
    staleTime: 30 * 1000, // 30초 (짧지만 0은 아님)
    gcTime: 5 * 60 * 1000, // 5분
    // 페이지 포커스 시 자동 새로고침 (결제 완료 후 확인용)
    refetchOnWindowFocus: true,
    // 네트워크 재연결 시 새로고침
    refetchOnReconnect: true,
    // 에러 발생 시 재시도 설정
    retry: (failureCount: number, error: ApiError) => {
      // 4xx 에러는 재시도하지 않음
      if (error?.status && error.status >= 400 && error.status < 500) {
        return false;
      }
      // 최대 2번까지만 재시도
      return failureCount < 2;
    },
  });
}

export type { Receipt, ReceiptItem, ReceiptsResponse }; 