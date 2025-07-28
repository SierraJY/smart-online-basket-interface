//상세 목록 페이지 (클라이언트)

'use client'

import { useEffect, useState } from "react"

type Product = {
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

// id만 받아서 fetch (명세서 맞춤)
function useProductDetail(id: string) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    fetch(`/api/products/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("상품 데이터 로드 실패")
        return res.json()
      })
      .then(data => {
        setProduct(data.product)
        setLoading(false)
      })
      .catch(e => {
        setError(e)
        setLoading(false)
      })
  }, [id])

  return { product, loading, error }
}

export default function ProductDetailClient({ id }: { id: string }) {
  const { product, loading, error } = useProductDetail(id)

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><div>로딩 중...</div></main>
  }
  if (error || !product) {
    return <main className="min-h-screen flex items-center justify-center">
      <div>상품을 찾을 수 없습니다</div>
    </main>
  }

  // 카테고리 언더바를 슬래쉬로 치환
  const replaceCategoryName = (cat: string) => cat.replace(/_/g, '/');

  return (
    <main
      className="min-h-screen flex flex-col items-center"
      style={{
        background: 'var(--input-background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}
    >
      <div className="relative w-screen max-w-[540px] h-[32vh] sm:h-[280px] mx-auto overflow-hidden rounded-b-2xl">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          style={{
            objectPosition: 'center top',
            transition: 'filter 0.7s',
            filter: 'brightness(0.96) saturate(1.08)'
          }}
        />
      </div>
      {/* 상세정보 영역 */}
      <div
        className="w-full max-w-[540px] -mt-5 px-6 pt-7 pb-75 rounded-2xl shadow-xl relative z-10"
        style={{
          background: 'var(--footer-background)',
          border: '1.5px solid var(--footer-border)',
          marginBottom: 24,
          boxShadow: '0 6px 32px 0 rgba(0,0,0,0.09)',
          backdropFilter: 'blur(10px) saturate(140%)',
          transition: 'background-color 1.6s, color 1.6s, border-color 1.6s'
        }}
      >
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          {product.name}
        </h1>
        <p className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
          {product.price.toLocaleString()}원
        </p>
        <p className="text-md font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
          {product.brand}
        </p>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          남은 재고 : {product.stock}
        </p>
        <p className="text-sm mb-4" style={{ color: '#34cd55', opacity: 0.8 }}>
          {replaceCategoryName(product.category)}
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {product.description}
        </p>
      </div>
    </main>
  )
}
