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

// 확장: id도 받을 수 있게!
interface Options {
  id?: string | number
  keyword?: string
  category?: string
}

export function useProducts(options: Options = {}) {
  const { id, keyword = "", category = "" } = options

  const [product, setProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    // id가 있으면 단일 상품 조회
    if (id) {
      fetch(`/api/products/${id}`)
        .then(res => {
          if (!res.ok) throw new Error("상품 데이터 로드 실패")
          return res.json()
        })
        .then(data => {
          setProduct(data.product || null)
          setProducts([]) // 혹시 이전 리스트 남을 수 있으니 비움
          setLoading(false)
        })
        .catch(e => {
          setError(e)
          setLoading(false)
        })
      return
    }

    // 기존 리스트 조회 로직
    let url = "/api/products"
    if (keyword && keyword.trim().length > 0) {
      url = `/api/products/search?keyword=${encodeURIComponent(keyword)}`
    } else if (category && category !== "전체") {
      url = `/api/products/category/${encodeURIComponent(category)}`
    }

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("상품 데이터 로드 실패")
        return res.json()
      })
      .then(data => {
        setProducts(Array.isArray(data.products) ? data.products : [])
        setProduct(null)
        setLoading(false)
      })
      .catch(e => {
        setError(e)
        setLoading(false)
      })
  }, [id, keyword, category])

  return {
    product,
    products,
    loading,
    error,
  }
}
