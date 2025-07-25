//상세 목록 페이지 (클라이언트)

'use client'

import { useProducts } from '@/utils/hooks/useProducts'
import { useAuthStore } from '@/store/useAuthStore'
import { toggleWishlist } from '@/utils/wishlistUtils'
import { getToken } from '@/utils/auth/authUtils'
import { Plus, Check } from 'lucide-react'
import { useEffect } from 'react'

export default function ProductDetailClient({ id }: { id: string }) {
  const { products, loading, error } = useProducts()
  const { email, wishlist, setWishlist } = useAuthStore()

  useEffect(() => {
    if (email) {
      const stored = localStorage.getItem(`wishlist-${email}`)
      setWishlist(stored ? JSON.parse(stored) : [])
    }
  }, [email, setWishlist])

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><div>로딩 중...</div></main>
  }
  if (error) {
    return <main className="min-h-screen flex items-center justify-center"><div>에러: {error.message}</div></main>
  }

  // id로 상품 상세 찾기
  const product = products.find((p) => String(p.id) === String(id))
  if (!product) {
    return (
      <main className="min-h-screen flex items-center justify-center"
        style={{
          background: 'var(--input-background)',
          color: 'var(--foreground)'
        }}>
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>상품을 찾을 수 없습니다</p>
      </main>
    )
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
        <button
          onClick={() => {
            if (!getToken()) {
              alert('로그인 후 이용 가능합니다.')
              return
            }
            const updated = toggleWishlist(email, product.id)
            setWishlist(updated)
          }}
          className="absolute top-4 right-4 p-2 rounded-full hover:scale-110 transition-all z-10"
        >
          {wishlist.includes(product.id)
            ? <Check size={28} color="var(--foreground)" strokeWidth={2.2} />
            : <Plus size={28} color="var(--foreground)" strokeWidth={2.2} />
          }
        </button>
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