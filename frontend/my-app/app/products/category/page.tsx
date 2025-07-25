// 카테고리 별 상품 전체 목록 페이지

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { toggleWishlist } from '@/utils/wishlistUtils'
import Link from 'next/link'
import { Plus, Check } from 'lucide-react'
import { getToken } from '@/utils/auth/authUtils'
import ShakeWrapper from '@/components/ShakeWrapper'
import { useProducts } from '@/utils/hooks/useProducts'

export default function CategoryPage() {
  const { products, loading, error } = useProducts()
  const searchParams = useSearchParams()
  const category = searchParams.get('category') || ''
  const [search, setSearch] = useState('')
  const { email, wishlist, setWishlist } = useAuthStore()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  // 찜 추가 시 찜 목록에 저장 (localstorage로 임시 테스트)
  useEffect(() => {
    if (email) {
      const stored = localStorage.getItem(`wishlist-${email}`)
      setWishlist(stored ? JSON.parse(stored) : [])
    }
  }, [email])

  useEffect(() => {
    const isMobile = window.innerWidth < 768
    setItemsPerPage(isMobile ? 10 : 15)
  }, [])

  // 로딩/에러 처리
  if (loading) return <main className="min-h-screen flex items-center justify-center"><div>로딩 중...</div></main>
  if (error) return <main className="min-h-screen flex items-center justify-center"><div>에러: {error.message}</div></main>

  const filtered = products.filter(
    (item) =>
      (category === '' || item.category === category) &&
      [item.name, item.description, item.category].join(' ').toLowerCase().includes(search.toLowerCase())
  )

  // 카테고리 언더바를 슬래쉬로 치환
  const replaceCategoryName = (cat: string) => cat.replace(/_/g, '/');

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <main
      className="min-h-screen px-4 py-10 pb-24 flex flex-col items-center"
      style={{
        background: 'var(--input-background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s',
      }}
    >
      <h1 className="text-2xl font-bold mb-4 mt-10 tracking-tight" style={{ color: 'var(--foreground)' }}>
        {replaceCategoryName(category)}
      </h1>

      {/* 검색창 */}
      <div
        className="flex items-center w-full max-w-3xl mb-7"
        style={{
          borderRadius: '999px',
          background: 'var(--modal-glass-bg, rgba(255,255,255,0.36))',
          border: '1.5px solid var(--input-border)',
          boxShadow: '0 1.5px 10px 0 rgba(0,0,0,0.06)',
          overflow: 'hidden',
          backdropFilter: 'blur(9px)',
          WebkitBackdropFilter: 'blur(9px)',
          transition: 'background 0.4s, border 0.4s',
        }}
      >
        <input
          type="text"
          placeholder="상품명을 입력하세요..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-5 py-3 text-base bg-transparent focus:outline-none font-medium"
          style={{
            color: 'var(--foreground)',
            border: 'none',
            letterSpacing: '-0.01em',
          }}
        />
      </div>

      <section className="w-full max-w-2xl sm:max-w-3xl md:max-w-4xl">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-7">
          {paginatedItems.length === 0 ? (
            <div className="col-span-full text-center text-lg py-10 text-[var(--text-secondary)]">
              해당 카테고리의 상품이 없습니다.
            </div>
          ) : (
            paginatedItems.map((item) => (
              <ShakeWrapper key={item.id} item={item}>
                <div className="relative w-full flex flex-col items-center group">
                  <Link href={`/products/${item.id}`} className="w-full flex flex-col items-center">
                    {/* 이미지 */}
                    <div className="w-full h-[120px] sm:h-[145px] flex items-center justify-center mb-3 rounded-xl overflow-hidden bg-[var(--input-background)] group-hover:scale-105 transition">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="object-contain w-full h-full"
                        style={{
                          maxHeight: 120,
                          maxWidth: 170,
                          background: 'var(--input-background)'
                        }}
                      />
                    </div>
                    {/* 상품명 줄임 */}
                    <span
                      className="block text-[15px] font-medium mt-1 mb-0.5 text-center leading-tight max-w-[135px]"
                      style={{
                        color: 'var(--foreground)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        minHeight: '40px',
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    {/* 가격/할인 */}
                    {item.discountRate > 0 ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="bg-red-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-0.5 shadow-sm">
                          {item.discountRate}% OFF
                        </span>
                        <span className="text-[17px] font-extrabold text-red-700">
                          {Math.round(item.price * (1 - item.discountRate / 100)).toLocaleString()}원
                        </span>
                        <span className="text-[13px] text-gray-400 line-through opacity-70">
                          {item.price.toLocaleString()}원
                        </span>
                      </div>
                    ) : (
                      <span className="block text-[15px] font-semibold text-center" style={{ color: 'var(--text-secondary)' }}>
                        {item.price.toLocaleString()}원
                      </span>
                    )}
                  </Link>
                  {/* 찜 버튼 */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      if (!getToken()) {
                        alert('로그인 후 이용 가능합니다.')
                        return
                      }
                      const updated = toggleWishlist(email, item.id)
                      setWishlist(updated)
                    }}
                    className="absolute top-2 right-2 text-lg px-1.5 py-1.5 rounded-full hover:scale-110 transition-all z-10"
                    title={wishlist.includes(item.id) ? '찜 해제' : '찜'}
                  >
                    {wishlist.includes(item.id)
                      ? <Check size={25} color="var(--foreground)" strokeWidth={2.25} />
                      : <Plus size={25} color="var(--foreground)" strokeWidth={2.25} />
                    }
                  </button>
                </div>
              </ShakeWrapper>
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-10 items-center space-x-6 text-[var(--foreground)] font-medium">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="text-lg px-2 py-1 rounded hover:scale-110 active:scale-95 transition"
            >
              {'<'}
            </button>
            <span className="text-base">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="text-lg px-2 py-1 rounded hover:scale-110 active:scale-95 transition"
            >
              {'>'}
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
