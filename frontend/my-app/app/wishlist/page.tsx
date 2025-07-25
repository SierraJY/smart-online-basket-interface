// 찜 목록 페이지

'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import Link from 'next/link'
import { Minus } from 'lucide-react'
import { getToken } from '@/utils/auth/authUtils'
import { redirect } from 'next/navigation'
import { useProducts } from '@/utils/hooks/useProducts'

export default function WishlistPage() {
  const { products, loading, error } = useProducts()
  const { email, wishlist, setWishlist } = useAuthStore()

  useEffect(() => {
    if (!getToken()) redirect('/login')
    const saved = localStorage.getItem(`wishlist-${email}`)
    if (saved) setWishlist(JSON.parse(saved))
    else setWishlist([])
  }, [email, setWishlist])

  // 로딩/에러 처리
  if (loading) return <main className="min-h-screen flex items-center justify-center"><div>로딩 중...</div></main>
  if (error) return <main className="min-h-screen flex items-center justify-center"><div>에러: {error.message}</div></main>

  const filtered = products.filter((p) => wishlist.includes(p.id))

  // 찜 해제
  const handleRemove = (id: number) => {
    const updated = wishlist.filter((itemId) => itemId !== id)
    setWishlist(updated)
    if (email) {
      localStorage.setItem(`wishlist-${email}`, JSON.stringify(updated))
    }
  }

  return (
    <main
      className="min-h-screen px-4 py-10 pb-24 flex flex-col items-center"
      style={{
        background: 'var(--input-background)',
        color: 'var(--foreground)',
      }}
    >
      <h1 className="text-2xl font-bold mb-8 mt-10" style={{ color: 'var(--foreground)' }}>
        내 찜 목록
      </h1>

      {filtered.length === 0 ? (
        <p className="text-lg text-center text-[var(--foreground)] mt-10">
          찜한 상품이 없습니다
        </p>
      ) : (
        <ul className="w-full max-w-2xl flex flex-col gap-5">
          {filtered.map((item) => (
            <li key={item.id}
              className="flex gap-4 items-center p-4 rounded-2xl shadow border border-[var(--background)] bg-[var(--input-background)]">
              <Link href={`/products/${item.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-20 h-20 rounded-xl object-contain bg-[var(--input-background)]"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-[var(--foreground)]">{item.name}</span>
                  <span className="text-sm text-[var(--foreground)]">{item.price.toLocaleString()}원</span>
                </div>
              </Link>
              <button
                onClick={() => handleRemove(item.id)}
                className="p-2 rounded-full hover:scale-110 transition-all"
                style={{ backdropFilter: 'blur(3px)' }}
                title="찜 해제"
              >
                <Minus size={20} strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}