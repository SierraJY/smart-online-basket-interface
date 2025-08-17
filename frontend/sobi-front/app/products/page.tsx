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
import { replaceCategoryName, extractCategories, formatPrice, calculateDiscountedPrice } from '@/utils/stringUtils'
import { CATEGORY_ICONS, CategoryName } from '@/components/categoryIcons'
import { motion, AnimatePresence } from 'framer-motion'

const CATEGORY_LIMIT = 10

export default function ProductsPage() {
  const { products, loading, error } = useProducts()
  useScrollRestore(!loading && products.length > 0)
  const searchParams = useSearchParams()
      const router = useRouter()
    const [showTooltip, setShowTooltip] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    // 외부 클릭 시 툴팁 닫기
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
          setShowTooltip(false)
        }
      }

      if (showTooltip) {
        document.addEventListener('mousedown', handleClickOutside)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [showTooltip])

  const categoryFromURL = useMemo(() => searchParams.get('category') || '전체', [searchParams])
  const [category, setCategory] = useState<CategoryName>(categoryFromURL as CategoryName)

  const excludeOutOfStockFromURL = useMemo(() => searchParams.get('excludeOutOfStock') === 'true', [searchParams])
  const [excludeOutOfStock, setExcludeOutOfStock] = useState<boolean>(excludeOutOfStockFromURL)

  // 검색을 위한 상태
  const [keyword, setKeyword] = useState<string>('')

  // 카테고리 스크롤을 위한 상태
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  // 카테고리 배열 정의
  const categories: CategoryName[] = useMemo(() => [
    '전체', '과일', '채소', '쌀_잡곡_견과', '정육_계란류', 
    '수산물_건해산', '우유_유제품', '김치_반찬_델리', '생수_음료_주류', '커피_원두_차',
    '면류_통조림', '양념_오일', '과자_간식', '베이커리_잼', '건강식품'
  ], [])

  // 카테고리 배경색 배열
  const categoryColors = useMemo(() => [
    '#21ce80', '#4ECDC4', '#edb482', '#fab1a2', '#82E0AA',
    '#f6b0cd', '#a5ed82', '#b2eafa', '#BB8FCE', '#DDA0DD',
    '#96CEB4', '#F7DC6F', '#98D8C8', '#85C1E9', '#87c873'
  ], [])

  // 쿼리스트링이 바뀌면 input값 동기화!
  useEffect(() => {
    setCategory(categoryFromURL as CategoryName)
    setExcludeOutOfStock(excludeOutOfStockFromURL)
  }, [categoryFromURL, excludeOutOfStockFromURL])

  const onCategoryChange = (val: CategoryName) => {
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

  // 마우스 드래그 스크롤 핸들러들
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    setStartX(e.pageX - e.currentTarget.offsetLeft)
    setScrollLeft(e.currentTarget.scrollLeft)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.preventDefault()
    const x = e.pageX - e.currentTarget.offsetLeft
    const walk = (x - startX) * 1.2 // 스크롤 속도 조절
    e.currentTarget.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  // 필터링
  const filtered: Product[] = products.filter((item: Product) => {
    const matchesCategory = category === '전체' || item.category === category
    const matchesStock = excludeOutOfStock || item.stock > 0
    return matchesCategory && matchesStock
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

  const cardClass = "item-card flex-shrink-0 w-[100px] h-[150px] md:w-[130px] md:h-[170px] snap-start flex flex-col items-center px-1 pt-1 pb-1 transition-all relative bg-transparent"

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)' 
      }}
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
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
      const width = card.getBoundingClientRect().width + 12
      ref.current.scrollBy({ left: dir * width, behavior: 'smooth' })
    }
  }



  return (
    <main className="min-h-screen px-3 py-6 pb-20 flex flex-col items-center" 
      style={{ 
        color: 'var(--foreground)', 
        transition: 'background-color 1.6s, color 1.6s',
        backgroundColor: 'var(--background)'
      }}
    >
      <div className="flex items-center justify-center mb-4 mt-10">
        <div className="relative" ref={tooltipRef}>
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200 touch-manipulation"
            onClick={() => setShowTooltip(!showTooltip)}
          >
            {CATEGORY_ICONS["전체"]}
          </div>
          
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 rounded-2xl text-sm font-medium whitespace-nowrap z-10"
                style={{
                  background: 'var(--sobi-green)',
                  border: '1px solid var(--footer-border)',
                  backdropFilter: 'blur(10px) saturate(140%)',
                  color: 'var(--foreground)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)'
                }}
              >
                {/* 말풍선 꼬리 */}
                <div 
                  className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: `8px solid var(--sobi-green)`,
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                  }}
                />
                
                <div className="text-center text-white">
                  <div className="font-semibold">전체 상품 목록</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="w-full max-w-2xl mx-auto">
        <SearchBar
          keyword={keyword}
          setKeyword={setKeyword}
          category={category}
          setCategory={onCategoryChange}
          onSearch={() => {
            if (keyword.trim()) {
              const searchUrl = `/products/search?keyword=${encodeURIComponent(keyword.trim())}`
              router.push(searchUrl)
            }
          }}
          showCategorySelect={true}
          showResultButton={false}
        />
      </div>
      
      {/* 카테고리 필터 섹션 */}
      <div className="w-full max-w-4xl mb-2 mt-4">
        <div 
          ref={categoryScrollRef}
          className="flex overflow-x-auto gap-3 pt-2 pb-4 scrollbar-none cursor-grab"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            overflowY: 'visible',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {categories.map((cat, index) => {
            const categoryName = cat.replace(/_/g, '/')
            const backgroundColor = categoryColors[index]
            const isSelected = category === cat
            
            const handleCategoryClick = () => {
              if (cat === '전체') {
                // 전체 카테고리 선택 시 상품 전체 목록 페이지로 이동
                router.push('/products')
              } else {
                onCategoryChange(cat)
              }
            }
            
            return (
              <button
                key={cat}
                onClick={handleCategoryClick}
                className={`flex flex-col items-center group min-w-[60px] transition-all duration-200 ${
                  isSelected ? 'scale-110' : 'hover:scale-105'
                }`}
                style={{ userSelect: 'none' }}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-lg transition-all duration-300 ${
                    isSelected 
                      ? 'shadow-xl ring-2 ring-white ring-opacity-50' 
                      : 'hover:shadow-xl'
                  }`}
                  style={{ 
                    backgroundColor: isSelected ? backgroundColor : backgroundColor + '80',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                  }}
                >
                  <div className="text-white">
                    {CATEGORY_ICONS[cat]}
                  </div>
                </div>
                <span 
                  className={`text-[11px] font-medium text-center transition-colors whitespace-nowrap ${
                    isSelected 
                      ? 'text-[var(--sobi-green)] font-bold' 
                      : 'text-[var(--foreground)] group-hover:text-[var(--sobi-green)]'
                  }`}
                >
                  {categoryName}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4 mt-3 select-none">
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
      <div className="w-full mt-6 max-w-4xl">
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
              <div className="flex justify-between items-center mb-3">
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
                <div ref={scrollRef} className="flex overflow-x-auto gap-3 snap-x snap-mandatory -mx-1 scrollbar-none cursor-pointer" style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
                  {items.slice(0, CATEGORY_LIMIT).map((item: Product) => (
                    <div key={item.id} className={`${cardClass} group hover:scale-105 transition-all duration-300`}>
                      <ShakeWrapper item={item}>
                        <div className="relative w-full h-[90px] flex items-center justify-center">
                          <Link href={`/products/${item.id}`} className="hover:scale-105 transition-all duration-200 hover:scale-105 block w-full h-full flex items-center justify-center">
                            <div className="relative w-full h-full rounded-2xl overflow-hidden"
                              style={{
                                background: 'linear-gradient(135deg, var(--sobi-green-light) 0%, var(--input-background) 100%)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                              }}>
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                className="object-cover w-full h-full rounded-2xl group-hover:scale-110"
                                style={{ 
                                  maxHeight: 90, 
                                  maxWidth: 100, 
                                  backgroundColor: 'var(--input-background)',
                                  minHeight: 90,
                                  minWidth: 100,
                                  transition: 'all 0.3s ease'
                                }}
                                width={120}
                                height={120}
                                priority={false}
                                loading="lazy"
                                sizes="(max-width: 768px) 100px, 100px"
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
                                                             {/* 그라데이션 오버레이 - 페이드아웃 효과 */}
                               <div 
                                 className="absolute inset-0 rounded-2xl pointer-events-none"
                                 style={{
                                   background: 'radial-gradient(circle at center, transparent 60%, var(--gradient-overlay-dark) 100%)',
                                   opacity: 0.8
                                 }}
                               />
                               {/* 테두리 그라데이션 효과 */}
                               <div 
                                 className="absolute inset-0 rounded-2xl pointer-events-none"
                                 style={{
                                   background: 'linear-gradient(135deg, var(--gradient-shadow-light) 0%, transparent 50%, var(--gradient-shadow-dark) 100%)',
                                   opacity: 0.6
                                 }}
                               />
                            </div>
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
                        <div className="h-[45px] flex flex-col justify-center">
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
                    <Link href={`/products/category?category=${encodeURIComponent(cat)}`} className="flex-shrink-0 w-[80px] h-[80px] snap-start flex flex-col items-center justify-center hover:scale-110 transition-all font-semibold text-md cursor-pointer"
                      style={{ 
                        minHeight: '125px', 
                        height: '125px', 
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
              <div className="w-full border-b border-[var(--input-border)] my-4" />
            </section>
          )
        })}
      </div>
    </main>
  )
}
