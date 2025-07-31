import { useQuery } from "@tanstack/react-query"

export type Product = {
  id: number
  name: string
  price: number
  stock: number
  category: string
  imageUrl: string
  discountRate: number
  sales: number
  tag: string | null
  location: string | null
  description: string | null
  brand: string
  discountedPrice: number
}

interface Options {
  id?: string | number
  keyword?: string
  category?: string
}

async function fetchProducts(options: Options = {}) {
  const { id, keyword = "", category = "" } = options

  // id가 있으면 단일 상품 조회
  if (id) {
    const res = await fetch(`/api/products/${id}`)
    if (!res.ok) throw new Error("상품 데이터 로드 실패")
    const data = await res.json()
    return { product: data.product || null, products: [] }
  }

  // 리스트(검색/카테고리)
  let url = "/api/products"
  if (keyword && keyword.trim().length > 0) {
    url = `/api/products/search?keyword=${encodeURIComponent(keyword)}`
  } else if (category && category !== "전체") {
    url = `/api/products/category/${encodeURIComponent(category)}`
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error("상품 데이터 로드 실패")
  const data = await res.json()
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
    queryFn: () => fetchProducts(options),
    staleTime: 1000 * 60, // 1분 동안 캐시 유지
  })

  return {
    product: data?.product ?? null,
    products: data?.products ?? [],
    loading,
    error,
  }
}