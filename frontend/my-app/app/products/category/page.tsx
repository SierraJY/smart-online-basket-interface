'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ShakeWrapper from '@/components/ShakeWrapper'
import { useProducts } from '@/utils/hooks/useProducts'
import { useAuthStore } from '@/store/useAuthStore'
import { getToken } from '@/utils/auth/authUtils'
import { addFavorite, removeFavorite, fetchFavoriteList } from '@/utils/api/favorite'
import { FaHeart, FaRegHeart, FaExclamationTriangle } from "react-icons/fa";
import SearchBar from '@/components/SearchBar'

const ITEMS_PER_PAGE = 21

export default function CategoryPage() {
  const { products, loading, error } = useProducts()
  const searchParams = useSearchParams()
  const router = useRouter()

  const keywordFromURL = useMemo(() => searchParams.get('keyword') || '', [searchParams])
  const categoryFromURL = useMemo(() => searchParams.get('category') || '전체', [searchParams])
  const [keyword, setKeyword] = useState(keywordFromURL)
  const [category, setCategory] = useState(categoryFromURL)
  const [isMobile, setIsMobile] = useState(false)
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const { favorite, setFavorite, isLoggedIn } = useAuthStore()
  const [FavoriteLoading, setFavoriteLoading] = useState(false)

  useEffect(() => {
    setKeyword(keywordFromURL)
    setCategory(categoryFromURL)
  }, [keywordFromURL, categoryFromURL])

  const onKeywordChange = (val: string) => {
    setKeyword(val)
    const params = new URLSearchParams(searchParams)
    params.set('keyword', val)
    router.replace(`?${params.toString()}`)
  }
  const onCategoryChange = (val: string) => {
    setCategory(val)
    const params = new URLSearchParams(searchParams)
    params.set('category', val)
    router.replace(`?${params.toString()}`)
  }

  // 로그인 or 새로고침 시 찜목록 동기화
  useEffect(() => {
    if (isLoggedIn && getToken()) {
      fetchFavoriteList(getToken())
        .then((data) => setFavorite(data.favoriteProducts.map((p: any) => p.id)))
        .catch(() => setFavorite([]))
    } else {
      setFavorite([])
    }
  }, [isLoggedIn])

  const filtered = products.filter(
    (item) =>
      (category === '' || item.category === category) &&
      [item.name, item.description, item.category].join(' ').toLowerCase().includes(keyword.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const pagedProducts = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const replaceCategoryName = (cat: string) => cat.replace(/_/g, '/')
  const cardClass = "item-card flex-shrink-0 w-[115px] h-[210px] md:w-[135px] md:h-[235px] flex flex-col items-center px-1 pt-3 pb-2 transition-all relative bg-transparent"

  const gotoPage = (page: number) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('page', String(page))
    router.push(`?${params.toString()}`)
  }

  // 찜 토글
  const handleToggleFavorite = async (productId: number) => {
    if (!isLoggedIn || !getToken()) {
      alert('로그인 후 이용 가능합니다.')
      return
    }
    setFavoriteLoading(true)
    try {
      if (favorite.includes(productId)) {
        await removeFavorite(productId, getToken())
      } else {
        await addFavorite(productId, getToken())
      }
      const data = await fetchFavoriteList(getToken())
      setFavorite(data.favoriteProducts.map((p: any) => p.id))
    } catch (err: any) {
      alert(err.message || "찜 처리 오류")
    } finally {
      setFavoriteLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ background: 'var(--input-background)', color: 'var(--foreground)' }}
    >
      <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
      <div className="text-lg font-semibold text-[var(--foreground)]">{replaceCategoryName(category)} 상품 목록을 불러오는 중...</div>
      <div className="text-sm text-gray-400 mt-1">조금만 기다려 주세요!</div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[250px] py-10 text-center">
      <FaExclamationTriangle className="text-red-400 text-5xl mb-3 animate-bounce" />
      <div className="font-bold text-lg text-red-500 mb-2">문제가 발생했어요!</div>
      <div className="text-gray-500 text-base mb-4">{error.message}</div>
      <button
        className="mt-2 px-6 py-2 bg-red-500 text-white rounded-full shadow hover:bg-red-700 transition-all"
        onClick={() => window.location.reload()}
      >
        새로고침
      </button>
    </div>
  );

  return (
    <main className="min-h-screen px-2 py-7 pb-20 flex flex-col items-center" style={{ background: 'var(--input-background)', color: 'var(--foreground)' }}>
      <h1 className="text-2xl font-bold mb-5" style={{ color: 'var(--foreground)' }}>
        {replaceCategoryName(category)}
      </h1>
      <div className="flex items-center w-full max-w-3xl mb-7"
        style={{
          borderRadius: '999px',
          background: 'var(--modal-glass-bg, rgba(255,255,255,0.36))',
          border: '1.5px solid var(--input-border)',
          boxShadow: '0 1.5px 10px 0 rgba(0,0,0,0.06)',
          overflow: 'hidden',
          backdropFilter: 'blur(9px)',
          WebkitBackdropFilter: 'blur(9px)',
          transition: 'background 0.4s, border 0.4s',
        }}>
        <SearchBar
          keyword={keyword}
          setKeyword={onKeywordChange}
          category={category}
          setCategory={onCategoryChange}
          onSearch={() => {}}
          showCategorySelect={false}
          showResultButton={false}
        />
      </div>
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
                    style={{ maxHeight: isMobile ? 80 : 110, maxWidth: isMobile ? 90 : 120, background: 'var(--input-background)' }}
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
              className={`absolute top-2 right-2 text-lg px-1.5 py-1.5 rounded-full hover:scale-110 transition-all z-10 ${FavoriteLoading ? 'opacity-60 pointer-events-none' : ''}`}
              title={favorite.includes(item.id) ? '찜 해제' : '찜'}
              disabled={FavoriteLoading}
            >
              {favorite.includes(item.id)
                ? <FaHeart size={25} color="var(--foreground)" />
                : <FaRegHeart size={25} color="var(--foreground)" />
              }
            </button>
            <Link href={`/products/${item.id}`} className="w-full flex flex-col items-center">
              <span className="block text-[12px] md:text-[13.5px] font-medium mt-1 mb-0.5 text-center leading-tight max-w-[100px]"
                style={{ color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '30px' }}
                title={item.name}>
                {item.name}
              </span>
              {item.discountRate > 0 ? (
                <div className={"flex flex-col items-center gap-0.5 " + (item.stock === 0 ? "opacity-60 grayscale pointer-events-none cursor-not-allowed" : "")}>
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
                <span className={"block text-[15px] font-semibold text-center " + (item.stock === 0 ? "opacity-60 grayscale pointer-events-none cursor-not-allowed" : "")} style={{ color: 'var(--text-secondary)' }}>
                  {item.price.toLocaleString()}원
                </span>
              )}
            </Link>
          </div>
        ))}
      </section>
      {totalPages > 1 && (
        <nav className="flex items-center gap-1 mt-5 mb-12">
          <button
            className="px-2 py-1 text-sm font-medium hover:bg-neutral-100"
            disabled={currentPage === 1}
            onClick={() => gotoPage(currentPage - 1)}
            style={{ opacity: currentPage === 1 ? 0.4 : 1, pointerEvents: currentPage === 1 ? 'none' : undefined }}>
            <ChevronLeft strokeWidth={1.5} />
          </button>
          {(() => {
            const pageNumbers = [];
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, currentPage + 2);
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
                  ${pageNum === currentPage ? 'bg-green-600 text-white' : 'text-[var(--foreground)]'}
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
            style={{ opacity: currentPage === totalPages ? 0.4 : 1, pointerEvents: currentPage === totalPages ? 'none' : undefined }}>
            <ChevronRight strokeWidth={1.5} />
          </button>
        </nav>
      )}
    </main>
  )
}
