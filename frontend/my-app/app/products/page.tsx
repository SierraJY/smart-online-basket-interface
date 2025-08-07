// 전체 상품 목록 페이지

'use client'

import { useMemo, useRef, createRef, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useProducts } from '@/utils/hooks/useProducts'
import { Product } from '@/types'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FaExclamationTriangle } from "react-icons/fa"
import SearchBar from '@/components/SearchBar'
import ShakeWrapper from '@/components/ShakeWrapper'
import FavoriteIcon from '@/components/FavoriteIcon'
import { useScrollRestore } from '@/store/useScrollRestore'
import { useAuth } from '@/utils/hooks/useAuth'
import { replaceCategoryName, extractCategories, formatPrice, calculateDiscountedPrice } from '@/utils/stringUtils'

const CATEGORY_LIMIT = 10

export default function ProductsPage() {
  const { products, loading, error } = useProducts()
  useScrollRestore(!loading && products.length > 0)
  const searchParams = useSearchParams()
  const router = useRouter()

  const keywordFromURL = useMemo(() => searchParams.get('keyword') || '', [searchParams])
  const categoryFromURL = useMemo(() => searchParams.get('category') || '전체', [searchParams])
  const [keyword, setKeyword] = useState<string>(keywordFromURL)
  const [category, setCategory] = useState<string>(categoryFromURL)
  const { isLoggedIn, accessToken: token } = useAuth()
  const excludeOutOfStockFromURL = useMemo(() => searchParams.get('excludeOutOfStock') === 'true', [searchParams])
  const [excludeOutOfStock, setExcludeOutOfStock] = useState<boolean>(excludeOutOfStockFromURL)

  // 쿼리스트링이 바뀌면 input값 동기화!
  useEffect(() => {
    setKeyword(keywordFromURL)
    setCategory(categoryFromURL)
    setExcludeOutOfStock(excludeOutOfStockFromURL)
  }, [keywordFromURL, categoryFromURL, excludeOutOfStockFromURL])

  // 검색창 입력 시 쿼리스트링 변경
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

  const onExcludeOutOfStockChange = (checked: boolean) => {
    setExcludeOutOfStock(checked)
    const params = new URLSearchParams(searchParams)
    if (checked) {
      params.set('excludeOutOfStock', 'true')
    } else {
      params.delete('excludeOutOfStock')
    }
    router.replace(`?${params.toString()}`)
  }

  // 필터링
  const filtered: Product[] = products.filter((item: Product) => {
    const matchesKeyword =
      [item.name, item.description, item.category]
        .join(' ')
        .toLowerCase()
        .includes(keyword.toLowerCase())
    const matchesCategory = category === '전체' || item.category === category
    const matchesStock = excludeOutOfStock || item.stock > 0
    return matchesKeyword && matchesCategory && matchesStock
  })

  // 카테고리 추출 (유틸리티 함수 사용)
  const categoriesInFiltered: string[] = useMemo(
    () => extractCategories(filtered),
    [filtered]
  )

  // 현재 보여줄 카테고리
  const categorySections: string[] = category === '전체' ? categoriesInFiltered : [category]
  // 섹션별 ref 준비
  const sectionRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({})
  categorySections.forEach((cat: string) => {
    if (!sectionRefs.current[cat]) {
      sectionRefs.current[cat] = createRef<HTMLDivElement>()
    }
  })

  const cardClass = "item-card flex-shrink-0 w-[120px] h-[180px] md:w-[150px] md:h-[200px] snap-start flex flex-col items-center px-2 pt-2 pb-1 transition-all relative bg-transparent"

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)' 
      }}
    >
      <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
      <div className="text-lg font-semibold text-[var(--foreground)]">전체 상품 목록을 불러오는 중...</div>
      <div className="text-sm text-gray-400 mt-1">조금만 기다려 주세요!</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[250px] py-10 text-center"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)' 
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



  const scrollByCard = (ref: React.RefObject<HTMLDivElement | null> | undefined, dir: number) => {
    if (!ref?.current) return
    const card = ref.current.querySelector('.item-card') as HTMLElement | null
    if (card) {
      const width = card.getBoundingClientRect().width + 24
      ref.current.scrollBy({ left: dir * width, behavior: 'smooth' })
    }
  }



  return (
    <main className="min-h-screen px-4 py-10 pb-24 flex flex-col items-center" 
      style={{ 
        color: 'var(--foreground)', 
        transition: 'background-color 1.6s, color 1.6s',
        backgroundColor: 'var(--background)'
      }}
    >
      <h1 className="text-2xl font-bold mb-6 mt-10" style={{ color: 'var(--sobi-green)' }}>전체 상품 목록</h1>
      <SearchBar
        keyword={keyword}
        setKeyword={onKeywordChange}
        category={category}
        setCategory={onCategoryChange}
        onSearch={() => {}}
        showCategorySelect={true}
        showResultButton={false}
      />
      <div className="flex items-center gap-3 mb-6 mt-4 select-none">
        <label htmlFor="excludeOutOfStock" className="flex items-center gap-2 cursor-pointer group" style={{ userSelect: "none" }}>
          <div className="relative">
            <input
              type="checkbox"
              id="excludeOutOfStock"
              checked={excludeOutOfStock}
              onChange={e => onExcludeOutOfStockChange(e.target.checked)}
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
            품절 상품 포함
          </span>
        </label>
      </div>
      <div className="w-full mt-10 max-w-4xl">
        {categorySections.length === 0 && (
          <p className="text-lg text-center mt-10" style={{ color: 'var(--text-secondary)' }}>
            검색 결과가 없습니다
          </p>
        )}
        {categorySections.map((cat: string) => {
          const items: Product[] = filtered.filter((item: Product) => item.category === cat)
          if (items.length === 0) return null
          const scrollRef = sectionRefs.current[cat]!
          const showMore = items.length > CATEGORY_LIMIT
          return (
            <section key={cat} className="mb-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                  {replaceCategoryName(cat)}
                </h2>
                <Link href={`/products/category?category=${encodeURIComponent(cat)}`} className="ml-2 px-2 py-1 text-xs font-medium transition hover:scale-110"
                  style={{ color: 'var(--sobi-green)', marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 500 }}>
                  {replaceCategoryName(cat)} 전체보기
                  <ChevronRight size={16} />
                </Link>
              </div>
              <div className="relative">
                {/* 왼쪽 화살표 */}
                <button
                  type="button"
                  className="hidden md:flex absolute z-20 left-[-50px] top-1/2 -translate-y-1/2 rounded-full p-1 hover:scale-110 transition-all"
                  style={{ pointerEvents: 'auto', color: 'var(--sobi-green)' }}
                  onClick={() => scrollByCard(scrollRef, -1.5)}
                  tabIndex={-1.5}
                  aria-label="왼쪽으로 이동"
                >
                  <ChevronLeft size={26} />
                </button>
                {/* 상품 리스트 */}
                <div ref={scrollRef} className="flex overflow-x-auto gap-5 snap-x snap-mandatory -mx-1 scrollbar-none cursor-pointer" style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
                  {items.slice(0, CATEGORY_LIMIT).map((item: Product) => (
                    <div key={item.id} className={cardClass}>
                      <ShakeWrapper item={item}>
                        <div className="relative w-full h-[110px] flex items-center justify-center">
                          <Link href={`/products/${item.id}`} className="hover:scale-105 transition-all duration-200 hover:scale-105 block w-full h-full flex items-center justify-center">
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              className="object-cover w-full h-full rounded-2xl"
                              style={{ 
                                maxHeight: 110, 
                                maxWidth: 120, 
                                backgroundColor: 'var(--input-background)',
                                minHeight: 110,
                                minWidth: 120
                              }}
                              width={120}
                              height={120}
                              priority={false}
                              loading="lazy"
                              sizes="(max-width: 768px) 120px, 120px"
                              quality={85}
                              onLoad={(e) => {
                                // 이미지 로드 완료 후 레이아웃 안정화
                                const target = e.target as HTMLImageElement;
                                target.style.opacity = '1';
                              }}
                              onError={(e) => {
                                // 에러 시에도 레이아웃 유지
                                const target = e.target as HTMLImageElement;
                                target.style.opacity = '1';
                              }}
                            />
                          </Link>
                          {/* 할인 배지 */}
                          {item.discountRate > 0 && (
                            <div className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                              {item.discountRate}%
                            </div>
                          )}
                          {/* 찜 인디케이터 */}
                          <FavoriteIcon productId={item.id} readOnly={true} />
                        </div>
                      </ShakeWrapper>
                      <Link href={`/products/${item.id}`}>
                        {/* 가격 부분 */}
                        <div className="h-[55px] flex flex-col justify-center">
                           {item.discountRate > 0 ? (
                             <div className={"flex flex-col items-center gap-0.5 " + (item.stock === 0 ? "opacity-60 grayscale" : "")}>
                               <span className="text-[13px] text-gray-400 line-through opacity-70">
                                 {formatPrice(item.price)}
                               </span>
                               <span className="text-[16px] font-bold text-red-700">
                                 {formatPrice(calculateDiscountedPrice(item.price, item.discountRate))}
                               </span>
                             </div>
                           ) : (
                             <span className={"block text-[15px] font-semibold text-center " + (item.stock === 0 ? "opacity-60 grayscale" : "")} style={{ color: 'var(--text-secondary)' }}>
                               {formatPrice(item.price)}
                             </span>
                           )}
                         </div>
                      </Link>
                    </div>
                  ))}
                  {/* 더보기 카드 */}
                  {showMore && (
                    <Link href={`/products/category?category=${encodeURIComponent(cat)}`} className="flex-shrink-0 w-[100px] h-[100px] snap-start flex flex-col items-center justify-center hover:scale-110 transition-all font-semibold text-md cursor-pointer"
                      style={{ 
                        minHeight: '155px', 
                        height: '155px', 
                        alignItems: 'center',
                        color: 'var(--text-secondary)',
                        borderRadius: '8px'
                      }}>
                      <span className="mb-1 text-3xl">+</span>
                      <span>더보기</span>
                    </Link>
                  )}
                </div>
                {/* 오른쪽 화살표 */}
                <button
                  type="button"
                  className="hidden md:flex absolute z-20 right-[-50px] top-1/2 -translate-y-1/2 rounded-full p-1 hover:scale-110 transition-all"
                  style={{ pointerEvents: 'auto', color: 'var(--sobi-green)' }}
                  onClick={() => scrollByCard(scrollRef, 1.5)}
                  tabIndex={-1.5}
                  aria-label="오른쪽으로 이동"
                >
                  <ChevronRight size={26} />
                </button>
              </div>
              {/* 구분선 */}
              <div className="w-full border-b border-[var(--input-border)] my-6" />
            </section>
          )
        })}
      </div>
    </main>
  )
}
