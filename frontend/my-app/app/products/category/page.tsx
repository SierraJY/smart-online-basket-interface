// 카테고리별 상품 목록 페이지

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ShakeWrapper from '@/components/ShakeWrapper'
import { useProducts } from '@/utils/hooks/useProducts'
import { Product } from '@/types'
import { useFavorite } from '@/utils/hooks/useFavorite'

import { FaHeart, FaRegHeart, FaExclamationTriangle } from "react-icons/fa"
import SearchBar from '@/components/SearchBar'
import { useAuth } from '@/utils/hooks/useAuth'
import Image from 'next/image';
import { replaceCategoryName, formatPrice, calculateDiscountedPrice } from '@/utils/stringUtils'

const ITEMS_PER_PAGE = 18

export default function CategoryPage() {
  const { products, loading, error } = useProducts()
  const searchParams = useSearchParams()
  const router = useRouter()

  const keywordFromURL = useMemo(() => searchParams.get('keyword') || '', [searchParams])
  const categoryFromURL = useMemo(() => searchParams.get('category') || '전체', [searchParams])
  const [keyword, setKeyword] = useState<string>(keywordFromURL)
  const [category, setCategory] = useState<string>(categoryFromURL)
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  const { isLoggedIn, accessToken: token } = useAuth()
  const {
    favoriteList,
    addFavorite,
    removeFavorite,
  } = useFavorite(token)

  const [FavoriteLoading, setFavoriteLoading] = useState<boolean>(false)

  // 쿼리스트링 sync
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

  // 필터
  const filtered: Product[] = products.filter(
    (item: Product) =>
      (category === '' || item.category === category) &&
      [item.name, item.description, item.category].join(' ').toLowerCase().includes(keyword.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const pagedProducts: Product[] = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )


  const cardClass = "item-card flex-shrink-0 w-[115px] h-[210px] md:w-[135px] md:h-[235px] flex flex-col items-center px-1 pt-3 pb-2 transition-all relative bg-transparent"

  const gotoPage = (page: number) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('page', String(page))
    router.push(`?${params.toString()}`)
  }

  // 찜 토글 (React Query)
  const handleToggleFavorite = async (productId: number) => {
    if (!isLoggedIn || !token) {
      alert('로그인 후 이용 가능합니다.')
      return
    }
    setFavoriteLoading(true)
    try {
      if (favoriteList.includes(productId)) {
        await removeFavorite({ productId, token })
      } else {
        await addFavorite({ productId, token })
      }
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
  )
  
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
  )

  return (
    <main className="min-h-screen px-4 py-10 pb-24 flex flex-col items-center"
      style={{
        background: 'var(--input-background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}>
      {/* 헤더 */}
      <h1 className="text-2xl font-bold mb-6 mt-10" style={{ color: 'var(--sobi-green)' }}>
        {replaceCategoryName(category)}
      </h1>
      {/* 🔥전체 상품 목록 페이지와 동일하게, 바로 아래에 SearchBar만! */}
      <SearchBar
        keyword={keyword}
        setKeyword={onKeywordChange}
        category={category}
        setCategory={onCategoryChange}
        onSearch={() => {}}
        showCategorySelect={false}
        showResultButton={false}
      />
      {/* 상품 목록 */}
      <section className="w-full mt-10 max-w-4xl flex flex-wrap gap-3 justify-start">
        {pagedProducts.length === 0 && (
          <div className="w-full text-center text-lg mt-16 text-[var(--text-secondary)]">
            해당 카테고리 상품이 없습니다.
          </div>
        )}
        {pagedProducts.map((item: Product) => (
          <div key={item.id} className={cardClass}>
            <ShakeWrapper item={item}>
              <Link href={`/products/${item.id}`}>
                <div className="w-full h-[80px] md:h-[110px] flex items-center justify-center mb-2 rounded-xl overflow-hidden bg-[var(--input-background)]">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={90}
                    height={80}
                    className="object-contain w-full h-full"
                    style={{ backgroundColor: 'var(--input-background)' }}
                    loading="lazy"
                  />
                </div>
              </Link>
            </ShakeWrapper>
            <button
              onClick={async (e) => {
                e.preventDefault()
                if (FavoriteLoading) return
                await handleToggleFavorite(item.id)
              }}
              className={`absolute top-2 right-2 text-lg px-1.5 py-1.5 rounded-full hover:scale-110 transition-all z-10 ${FavoriteLoading ? 'opacity-60 pointer-events-none' : ''}`}
              title={favoriteList.includes(item.id) ? '찜 해제' : '찜'}
              disabled={FavoriteLoading}
            >
              {favoriteList.includes(item.id)
                ? <FaHeart size={25} style={{ color: 'var(--sobi-green)' }} />
                : <FaRegHeart size={25} style={{ color: 'var(--sobi-green)' }} />
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
                     {formatPrice(calculateDiscountedPrice(item.price, item.discountRate))}
                   </span>
                   <span className="text-[13px] text-gray-400 line-through opacity-70">
                     {formatPrice(item.price)}
                   </span>
                 </div>
               ) : (
                 <span className={"block text-[15px] font-semibold text-center " + (item.stock === 0 ? "opacity-60 grayscale pointer-events-none cursor-not-allowed" : "")} style={{ color: 'var(--text-secondary)' }}>
                   {formatPrice(item.price)}
                 </span>
               )}
            </Link>
          </div>
        ))}
      </section>
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <nav className="flex items-center gap-1 mt-5 mb-12">
          <button
            className="px-2 py-1 text-sm font-medium hover:bg-neutral-100"
            disabled={currentPage === 1}
            onClick={() => gotoPage(currentPage - 1)}
            style={{ 
              opacity: currentPage === 1 ? 0.4 : 1, 
              pointerEvents: currentPage === 1 ? 'none' : undefined,
              color: 'var(--sobi-green)'
            }}>
            <ChevronLeft strokeWidth={1.5} />
          </button>
          {(() => {
            const pageNumbers = []
            let start = Math.max(1, currentPage - 2)
            let end = Math.min(totalPages, currentPage + 2)
            if (end - start < 4) {
              if (start === 1) end = Math.min(totalPages, start + 4)
              else if (end === totalPages) start = Math.max(1, end - 4)
            }
            for (let i = start; i <= end; i++) {
              pageNumbers.push(i)
            }
            return pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                className={`px-2.5 py-1 rounded-full font-medium
                  ${pageNum === currentPage ? 'text-white' : 'text-[var(--foreground)]'}
                `}
                style={{
                  backgroundColor: pageNum === currentPage ? 'var(--sobi-green)' : 'transparent',
                }}
                onClick={() => gotoPage(pageNum)}
                aria-current={pageNum === currentPage ? "page" : undefined}
              >{pageNum}</button>
            ))
          })()}
          <button
            className="px-2 py-1 text-sm font-medium hover:bg-neutral-100"
            disabled={currentPage === totalPages}
            onClick={() => gotoPage(currentPage + 1)}
            style={{ 
              opacity: currentPage === totalPages ? 0.4 : 1, 
              pointerEvents: currentPage === totalPages ? 'none' : undefined,
              color: 'var(--sobi-green)'
            }}>
            <ChevronRight strokeWidth={1.5} />
          </button>
        </nav>
      )}
    </main>
  )
}
