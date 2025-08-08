import { useQuery } from "@tanstack/react-query"
import { config } from '@/config/env'
import { Product, SearchOptions, ProductListResponse, ProductDetailResponse } from '@/types'
import { measureNetworkRequest } from '@/utils/performance'

// Product 타입을 다시 export
export type { Product }

interface Options extends SearchOptions {
  id?: string | number;
}

async function fetchProducts(options: Options = {}): Promise<{ product: Product | null; products: Product[] }> {
  const { id, keyword = "", category = "" } = options

  // id가 있으면 단일 상품 조회
  if (id) {
    const res = await fetch(`${config.API_ENDPOINTS.PRODUCTS}/${id}`)
    if (!res.ok) throw new Error("상품 데이터 로드 실패")
    const data: ProductDetailResponse = await res.json()
    return { product: data.product || null, products: [] }
  }

  // 리스트(검색/카테고리)
  let url = config.API_ENDPOINTS.PRODUCTS
  if (keyword && keyword.trim().length > 0) {
    url = `${config.API_ENDPOINTS.PRODUCTS_SEARCH}?keyword=${encodeURIComponent(keyword)}`
  } else if (category && category !== "전체") {
    url = `${config.API_ENDPOINTS.PRODUCTS_CATEGORY}/${encodeURIComponent(category)}`
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error("상품 데이터 로드 실패")
  const data: ProductListResponse = await res.json()
  return { product: null, products: Array.isArray(data.products) ? data.products : [] }
}

export function useProducts(options: Options = {}) {
  // 쿼리 키를 옵션별로 유니크하게!
  const queryKey = ["products", options]

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => measureNetworkRequest(
      () => fetchProducts(options),
      `products-${options.id || options.category || 'all'}`
    ),
    // 상품 데이터는 자주 변경되지 않으므로 더 긴 캐시 시간 설정
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분 동안 가비지 컬렉션 방지
    // 백그라운드에서 refetch 비활성화 (사용자가 페이지에 있을 때만)
    refetchOnWindowFocus: false,
    // 네트워크 재연결 시에만 refetch
    refetchOnReconnect: true,
    // 에러 발생 시 재시도 설정
    retry: (failureCount, error: any) => {
      // 4xx 에러는 재시도하지 않음
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // 최대 2번까지만 재시도
      return failureCount < 2;
    },
  })

  return {
    product: data?.product ?? null,
    products: data?.products ?? [],
    loading,
    error,
  }
}