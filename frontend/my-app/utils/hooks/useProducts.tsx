import { useEffect, useState } from "react"

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

// 파라미터: keyword, category (필요 없으면 undefined 전달)
interface Options {
  keyword?: string
  category?: string
}

// 상품 전체, 검색, 카테고리 모두 커버!
export function useProducts(options: Options = {}) {
  const { keyword = "", category = "" } = options

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    // 기본 url은 전체 조회
    let url = "/api/products"

    // 1. 키워드가 있으면 검색
    if (keyword && keyword.trim().length > 0) {
      url = `/api/products/search?keyword=${encodeURIComponent(keyword)}`
    }
    // 2. 카테고리만 있으면 카테고리 조회(백엔드 api에서 지원시)
    else if (category && category !== "전체") {
      url = `/api/products/category/${encodeURIComponent(category)}`
    }

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("상품 데이터 로드 실패")
        return res.json()
      })
      .then(data => {
        setProducts(Array.isArray(data.products) ? data.products : [])
        setLoading(false)
      })
      .catch(e => {
        setError(e)
        setLoading(false)
      })
  }, [keyword, category])

  return { products, loading, error }
}