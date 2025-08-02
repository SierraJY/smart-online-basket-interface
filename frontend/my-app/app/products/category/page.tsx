// 카테고리별 상품 목록 페이지

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ShakeWrapper from '@/components/ShakeWrapper'
import { useProducts } from '@/utils/hooks/useProducts'
import { Product } from '@/types'
import { FaExclamationTriangle } from "react-icons/fa"
import SearchBar from '@/components/SearchBar'
import Image from 'next/image';
import { replaceCategoryName, formatPrice, calculateDiscountedPrice } from '@/utils/stringUtils'

export default function CategoryPage() {
  const { products, loading, error } = useProducts()
  const searchParams = useSearchParams()
  const router = useRouter()

  const keywordFromURL = useMemo(() => searchParams.get('keyword') || '', [searchParams])
  const categoryFromURL = useMemo(() => searchParams.get('category') || '전체', [searchParams])
  const [keyword, setKeyword] = useState<string>(keywordFromURL)
  const [category, setCategory] = useState<string>(categoryFromURL)
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const [itemsPerPage, setItemsPerPage] = useState<number>(12) // 기본값 12
  const [excludeOutOfStock, setExcludeOutOfStock] = useState<boolean>(false)



  // 화면 크기에 따른 페이지당 아이템 수 설정
  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(window.innerWidth >= 768 ? 18 : 15)
    }
    
    updateItemsPerPage() // 초기 설정
    window.addEventListener('resize', updateItemsPerPage)
    
    return () => window.removeEventListener('resize', updateItemsPerPage)
  }, [])

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
      [item.name, item.description, item.category].join(' ').toLowerCase().includes(keyword.toLowerCase()) &&
      (!excludeOutOfStock || item.stock > 0)
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const pagedProducts: Product[] = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )


  const cardClass = "item-card w-full max-w-[120px] h-[160px] md:h-[180px] flex flex-col items-center px-1 pt-3 pb-1 transition-all relative bg-transparent"

  const gotoPage = (page: number) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('page', String(page))
    router.push(`?${params.toString()}`)
  }



  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ 
        background: 'linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)), url("/paper.jpg")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: 'var(--foreground)' 
      }}
    >
      <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
      <div className="text-lg font-semibold text-[var(--foreground)]">{replaceCategoryName(category)} 상품 목록을 불러오는 중...</div>
      <div className="text-sm text-gray-400 mt-1">조금만 기다려 주세요!</div>
    </div>
  )
  
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[250px] py-10 text-center"
      style={{ 
        background: 'linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)), url("/paper.jpg")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
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
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}>
      {/* 헤더 */}
      <h1 className="text-2xl font-bold mb-6 mt-10" style={{ color: 'var(--sobi-green)' }}>
        {replaceCategoryName(category)}
      </h1>
      {/* 전체 상품 목록 페이지와 동일하게, 바로 아래에 SearchBar만! */}
      <SearchBar
        keyword={keyword}
        setKeyword={onKeywordChange}
        category={category}
        setCategory={onCategoryChange}
        onSearch={() => {}}
        showCategorySelect={false}
        showResultButton={false}
      />
      {/* 품절 상품 제외 체크박스 */}
      <div className="flex items-center gap-3 mb-6 mt-4 select-none">
        <label htmlFor="excludeOutOfStock" className="flex items-center gap-2 cursor-pointer group" style={{ userSelect: "none" }}>
          <div className="relative">
            <input
              type="checkbox"
              id="excludeOutOfStock"
              checked={excludeOutOfStock}
              onChange={e => setExcludeOutOfStock(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-5 h-5 border-2 rounded transition-all peer-focus:outline-none ${
              excludeOutOfStock 
                ? 'bg-[var(--sobi-green)] border-[var(--sobi-green)]' 
                : 'bg-transparent border-[var(--text-secondary)]'
            }`}>
              {excludeOutOfStock && (
                <svg 
                  className="w-3 h-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-base font-semibold transition-colors duration-200 text-[var(--foreground)]">
            품절 상품 제외
          </span>
        </label>
      </div>
      {/* 상품 목록 */}
      <section className="w-full mt-8 max-w-4xl grid grid-cols-3 md:grid-cols-6 gap-2 justify-items-center">
        {pagedProducts.length === 0 && (
          <div className="col-span-3 md:col-span-6 text-center text-lg mt-16 text-[var(--text-secondary)]">
            해당 카테고리 상품이 없습니다.
          </div>
        )}
        {pagedProducts.map((item: Product) => (
          <div key={item.id} className={cardClass}>
            <ShakeWrapper item={item}>
              <Link href={`/products/${item.id}`}>
                <div className="w-full h-[100px] md:h-[110px] flex items-center justify-center mb-2 rounded-xl overflow-hidden bg-[var(--input-background)] relative">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={90}
                    height={80}
                    className="object-cover w-full h-full"
                    style={{ backgroundColor: 'var(--input-background)' }}
                    loading="lazy"
                  />
                  {/* 할인 배지 */}
                  {item.discountRate > 0 && (
                    <div className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      {item.discountRate}%
                    </div>
                  )}
                </div>
              </Link>
            </ShakeWrapper>
            <Link href={`/products/${item.id}`} className="w-full flex flex-col items-center">
              {item.discountRate > 0 ? (
                <div className={"flex flex-col items-center " + (item.stock === 0 ? "opacity-60 grayscale pointer-events-none cursor-not-allowed" : "")}>
                  <span className="text-[13px] text-gray-400 line-through opacity-70">
                    {formatPrice(item.price)}
                  </span>
                  <span className="text-[15px] font-extrabold text-red-700 -mt-1">
                    {formatPrice(calculateDiscountedPrice(item.price, item.discountRate))}
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
        <nav className="flex items-center gap-1 mt-4 mb-10">
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
