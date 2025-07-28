// 카테고리 별 상품 전체 목록 페이지

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ShakeWrapper from '@/components/ShakeWrapper'
import { useProducts } from '@/utils/hooks/useProducts'
import { useAuthStore } from '@/store/useAuthStore'
import { getToken } from '@/utils/auth/authUtils'
import { addFavorite, removeFavorite, fetchFavorite } from '@/utils/api/favorite'
import { FaHeart, FaRegHeart } from "react-icons/fa";

const ITEMS_PER_PAGE = 24

export default function CategoryPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const category = searchParams.get('category') || ''
  const searchFromURL = searchParams.get('search') || ''
  const [keyword, setKeyword] = useState('')
  const { products, loading, error } = useProducts({ category, keyword })
  const [isMobile, setIsMobile] = useState(false)
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const { favorite, setFavorite, isLoggedIn } = useAuthStore()
  const [FavoriteLoading, setFavoriteLoading] = useState(false)

  // 검색 input도 쿼리와 싱크
  useEffect(() => {
    setKeyword(searchFromURL)
  }, [searchFromURL])

  // 검색 input 변화 시 쿼리스트링도 갱신
  const onSearchChange = (val: string) => {
    setKeyword(val)
    const params = new URLSearchParams(searchParams)
    params.set('search', val)
    params.set('page', '1') // 검색하면 항상 1페이지로
    router.replace(`?${params.toString()}`)
  }

  // 필터링
  const filtered = products.filter(
    (item) =>
      (category === '' || item.category === category) &&
      [item.name, item.description, item.category].join(' ').toLowerCase().includes(keyword.toLowerCase())
  )

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const pagedProducts = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // 카테고리 언더바 → 슬래시
  const replaceCategoryName = (cat: string) => cat.replace(/_/g, '/')

  // 카드 반응형 크기/간격 맞춤 (상품 전체 목록 페이지와 동일)
  const cardClass = "item-card flex-shrink-0 w-[115px] h-[210px] md:w-[135px] md:h-[235px] flex flex-col items-center px-1 pt-3 pb-2 transition-all relative bg-transparent"

  // 페이지 이동
  const gotoPage = (page: number) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('page', String(page))
    router.push(`?${params.toString()}`)
  }

  // 찜 추가, 제거
  const handleToggleFavorite = async (productId: number) => {
  if (!isLoggedIn || !getToken()) {
    alert('로그인 후 이용 가능합니다.')
    return
  }
  setFavoriteLoading(true)
  try {
    if (favorite.includes(productId)) {
      await removeFavorite(productId)
    } else {
      await addFavorite(productId)
    }
    const data = await fetchFavorite()
    setFavorite(data.favoriteProducts.map((p: any) => p.id))
  } catch (err: any) {
    alert(err.message || "찜 처리 오류")
  } finally {
    setFavoriteLoading(false)
  }
}

  return (
    <main
      className="min-h-screen px-2 py-7 pb-20 flex flex-col items-center"
      style={{
        background: 'var(--input-background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s',
      }}
    >
      <h1 className="text-2xl font-bold mb-5" style={{ color: 'var(--foreground)' }}>
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
          value={keyword}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 px-5 py-3 text-base bg-transparent focus:outline-none font-medium"
          style={{
            color: 'var(--foreground)',
            border: 'none',
            letterSpacing: '-0.01em',
          }}
        />
      </div>

      {/* 상품 리스트 (카드 디자인 통일! 모바일/PC 반응형) */}
      <section className="w-full max-w-7xl flex flex-wrap gap-3 justify-start">
        {pagedProducts.length === 0 && (
          <div className="w-full text-center text-lg mt-16 text-[var(--text-secondary)]">
            해당 카테고리 상품이 없습니다.
          </div>
        )}
        {pagedProducts.map((item) => (
          <div key={item.id} className={cardClass}>
            <ShakeWrapper item={item}>
              <Link href={`/products/${item.id}`}>
                <div className="w-full h-[80px] md:h-[110px] flex items-center justify-center mb-2 rounded-xl overflow-hidden bg-[var(--input-background)]">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="object-contain w-full h-full"
                    style={{
                      maxHeight: isMobile ? 80 : 110,
                      maxWidth: isMobile ? 90 : 120,
                      background: 'var(--input-background)'
                    }}
                  />
                </div>
              </Link>
            </ShakeWrapper>
            <button
                onClick={async (e) => {
                  e.preventDefault()
                  if (FavoriteLoading) return;
                  await handleToggleFavorite(item.id)
                }}
                className={`absolute top-2 right-2 text-lg px-1.5 py-1.5 rounded-full hover:scale-110 transition-all z-10 ${
                  FavoriteLoading ? 'opacity-60 pointer-events-none' : ''
                }`}
                title={favorite.includes(item.id) ? '찜 해제' : '찜'}
                disabled={FavoriteLoading}
              >
                {favorite.includes(item.id)
                  ? <FaHeart size={25} color="var(--foreground)" />
                  : <FaRegHeart size={25} color="var(--foreground)" />
                }
              </button>
            <Link href={`/products/${item.id}`} className="w-full flex flex-col items-center">
              <span
                className="block text-[12px] md:text-[13.5px] font-medium mt-1 mb-0.5 text-center leading-tight max-w-[100px]"
                style={{
                  color: 'var(--foreground)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  minHeight: '30px',
                }}
                title={item.name}
              >
                {item.name}
              </span>
              {/* 가격/할인 */}
              {item.discountRate > 0 ? (
                <div
                  className={
                    "flex flex-col items-center gap-0.5 " +
                    (item.stock === 0 ? "opacity-60 grayscale pointer-events-none cursor-not-allowed" : "")
                  }
                >
                  <span className="bg-red-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-0.5 shadow-sm">
                    {item.discountRate}% OFF
                  </span>
                  <span className="text-[18px] font-extrabold text-red-700">
                    {Math.round(item.price * (1 - item.discountRate / 100)).toLocaleString()}원
                  </span>
                  <span className="text-[13px] text-gray-400 line-through opacity-70">
                    {item.price.toLocaleString()}원
                  </span>
                </div>
              ) : (
                <span
                  className={
                    "block text-[15px] font-semibold text-center " +
                    (item.stock === 0 ? "opacity-60 grayscale pointer-events-none cursor-not-allowed" : "")
                  }
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {item.price.toLocaleString()}원
                </span>
              )}
            </Link>
          </div>
        ))}
      </section>

      {/* 페이지네이션 바 */}
      {totalPages > 1 && (
        <nav className="flex items-center gap-1 mt-10 mb-2">
          <button
            className="px-2 py-1 text-sm font-medium hover:bg-neutral-100"
            disabled={currentPage === 1}
            onClick={() => gotoPage(currentPage - 1)}
            style={{ opacity: currentPage === 1 ? 0.4 : 1, pointerEvents: currentPage === 1 ? 'none' : undefined }}
          >
            <ChevronLeft strokeWidth={1.5} />
          </button>
          {(() => {
            const pageNumbers = [];
            // 범위 계산 (최소 1, 최대 totalPages)
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, currentPage + 2);
            // 항상 5개 숫자 보여주려면
            if (end - start < 4) {
              if (start === 1) end = Math.min(totalPages, start + 4);
              else if (end === totalPages) start = Math.max(1, end - 4);
            }
            for (let i = start; i <= end; i++) {
              pageNumbers.push(i);
            }
            return pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                className={`px-2.5 py-1 rounded-full font-medium
                  ${pageNum === currentPage
                    ? 'bg-green-600 text-white'
                    : 'hover:bg-neutral-100 text-[var(--foreground)]'
                  }
                `}
                onClick={() => gotoPage(pageNum)}
                aria-current={pageNum === currentPage ? "page" : undefined}
              >{pageNum}</button>
            ));
          })()}
          <button
            className="px-2 py-1 text-sm font-medium hover:bg-neutral-100"
            disabled={currentPage === totalPages}
            onClick={() => gotoPage(currentPage + 1)}
            style={{ opacity: currentPage === totalPages ? 0.4 : 1, pointerEvents: currentPage === totalPages ? 'none' : undefined }}
          >
            <ChevronRight strokeWidth={1.5} />
          </button>
        </nav>
      )}
    </main>
  )
}
