// 검색 결과 페이지

'use client'

import { useEffect, useState, useMemo, useRef, useDeferredValue } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import ShakeWrapper from '@/components/ShakeWrapper'
import FavoriteIcon from '@/components/FavoriteIcon'
import { useProducts } from '@/utils/hooks/useProducts'
import { Product } from '@/types'
import { FaExclamationTriangle } from "react-icons/fa"
import SearchBar from '@/components/SearchBar'
import Image from 'next/image';
import { formatPrice, calculateDiscountedPrice } from '@/utils/stringUtils'
import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORY_ICONS, CategoryName } from '@/components/categoryIcons'
import { filterProducts, paginateProducts, SORT_OPTIONS, SortOption, sortProducts } from '@/utils/products/listing'

// 정렬 옵션 타입 정의
// 정렬 옵션/유틸은 공통 모듈 사용

export default function SearchPage() {
  const { products, loading, error } = useProducts()
  const searchParams = useSearchParams()
  const router = useRouter()
  const sortDropdownRef = useRef<HTMLDivElement>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const keywordFromURL = useMemo(() => searchParams.get('keyword') || '', [searchParams])
  const categoryFromURL = useMemo(() => searchParams.get('category') || '전체', [searchParams])
  const sortFromURL = useMemo(() => (searchParams.get('sort') as SortOption) || 'id', [searchParams])
  
  const [keyword, setKeyword] = useState<string>(keywordFromURL)
  const deferredKeyword = useDeferredValue(keyword)
  const [category, setCategory] = useState<CategoryName>(categoryFromURL as CategoryName)
  const [sort, setSort] = useState<SortOption>(sortFromURL)
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState<boolean>(false)
  
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const [itemsPerPage, setItemsPerPage] = useState<number>(12) // 기본값 12
  const excludeOutOfStockFromURL = useMemo(() => searchParams.get('excludeOutOfStock') === 'true', [searchParams])
  const [excludeOutOfStock, setExcludeOutOfStock] = useState<boolean>(excludeOutOfStockFromURL)

  // 카테고리 배열 정의 (카테고리 페이지와 동일)
  const categories: CategoryName[] = useMemo(() => [
    '전체', '과일', '채소', '쌀_잡곡_견과', '정육_계란류', 
    '수산물_건해산', '우유_유제품', '김치_반찬_델리', '생수_음료_주류', '커피_원두_차',
    '면류_통조림', '양념_오일', '과자_간식', '베이커리_잼', '건강식품'
  ], [])

  // 카테고리 배경색 배열 (카테고리 페이지와 동일)
  const categoryColors = useMemo(() => [
    '#21ce80', '#4ECDC4', '#edb482', '#fab1a2', '#82E0AA',
    '#f6b0cd', '#a5ed82', '#b2eafa', '#BB8FCE', '#DDA0DD',
    '#96CEB4', '#F7DC6F', '#98D8C8', '#85C1E9', '#87c873'
  ], [])

  // 카테고리 스크롤 상태/핸들러 (카테고리 페이지와 동일)
  const [isDraggingCategory, setIsDraggingCategory] = useState(false)
  const [startXCategory, setStartXCategory] = useState(0)
  const [scrollLeftCategory, setScrollLeftCategory] = useState(0)
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  const handleCategoryMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingCategory(true)
    setStartXCategory(e.pageX - e.currentTarget.offsetLeft)
    setScrollLeftCategory(e.currentTarget.scrollLeft)
  }

  const handleCategoryMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCategory) return
    e.preventDefault()
    const x = e.pageX - e.currentTarget.offsetLeft
    const walk = (x - startXCategory) * 1.2
    e.currentTarget.scrollLeft = scrollLeftCategory - walk
  }

  const handleCategoryMouseUp = () => setIsDraggingCategory(false)
  const handleCategoryMouseLeave = () => setIsDraggingCategory(false)

  // 화면 크기에 따른 페이지당 아이템 수 설정
  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(window.innerWidth >= 768 ? 18 : 15)
    }
    
    updateItemsPerPage() // 초기 설정
    window.addEventListener('resize', updateItemsPerPage)
    
    return () => window.removeEventListener('resize', updateItemsPerPage)
  }, [])

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 헤더 툴팁 외부 클릭 닫기 (카테고리 페이지와 동일 동작)
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

  // 쿼리스트링 sync
  useEffect(() => {
    setKeyword(keywordFromURL)
    setCategory(categoryFromURL as CategoryName)
    setSort(sortFromURL)
    setExcludeOutOfStock(excludeOutOfStockFromURL)
  }, [keywordFromURL, categoryFromURL, sortFromURL, excludeOutOfStockFromURL])

  // 디바운스 적용 (300ms)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const onKeywordChange = (val: string) => {
    setKeyword(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      params.set('keyword', val)
      params.set('page', '1')
      router.replace(`?${params.toString()}`)
    }, 300)
  }

  const onCategoryChange = (val: CategoryName) => {
    setCategory(val)
    const params = new URLSearchParams(searchParams)
    params.set('category', val)
    params.set('page', '1') // 카테고리 변경 시 첫 페이지로 이동
    router.replace(`?${params.toString()}`)
  }

  const onSortChange = (val: SortOption) => {
    setSort(val)
    setIsSortDropdownOpen(false)
    const params = new URLSearchParams(searchParams)
    params.set('sort', val)
    params.set('page', '1') // 정렬 변경 시 첫 페이지로 이동
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
    params.set('page', '1') // 필터 변경 시 첫 페이지로 이동
    router.replace(`?${params.toString()}`)
  }

  // 검색 + 카테고리 필터링 (카테고리 페이지와 동일 조건 병합)
  const filtered: Product[] = filterProducts(products, deferredKeyword, category, excludeOutOfStock, true)

  // 정렬 함수
  const sortedProducts = useMemo(() => sortProducts(filtered, sort), [filtered, sort])

  const { totalPages, pageItems: pagedProducts } = paginateProducts(sortedProducts, currentPage, itemsPerPage)

  const cardClass = "item-card w-full max-w-[120px] h-[160px] md:h-[180px] flex flex-col items-center px-1 pt-3 pb-1 transition-all relative bg-transparent"

  const gotoPage = (page: number) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('page', String(page))
    router.push(`?${params.toString()}`)
  }

  // 현재 선택된 정렬 옵션의 라벨 가져오기
  const getCurrentSortLabel = () => {
    return SORT_OPTIONS.find(option => option.value === sort)?.label || '최신순'
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)' 
      }}
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
      <div className="text-lg font-semibold text-[var(--foreground)]">검색 결과를 불러오는 중...</div>
      <div className="text-sm text-gray-400 mt-1">조금만 기다려 주세요!</div>
    </div>
  )
  
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[250px] py-10 text-center"
      style={{ 
        backgroundColor: 'var(--background)'
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
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}>
      {/* 헤더 - 카테고리 페이지와 동일 구조 */}
      <div className="flex items-center justify-center mb-6 mt-10">
        <div className="relative" ref={tooltipRef}>
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200 touch-manipulation"
            onClick={() => setShowTooltip(!showTooltip)}
          >
            {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS["전체"]}
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
                검색 결과 - {category}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SearchBar (카테고리 페이지와 동일하게 선택 드롭다운은 별도) */}
      <div className="w-full max-w-2xl mx-auto">
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
          onMouseDown={handleCategoryMouseDown}
          onMouseMove={handleCategoryMouseMove}
          onMouseUp={handleCategoryMouseUp}
          onMouseLeave={handleCategoryMouseLeave}
        >
          {categories.map((cat, index) => {
            const categoryName = cat.replace(/_/g, '/')
            const backgroundColor = categoryColors[index]
            const isSelected = category === cat
            
            const handleCategoryClick = () => {
              // 검색 페이지에서는 '전체' 클릭 시에도 페이지 이동 없이
              // 검색 페이지 내에서 카테고리만 변경
              onCategoryChange(cat)
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

      {/* 필터 및 정렬 - 카테고리 페이지와 동일 스타일 */}
      <div className="flex items-center gap-4 mb-6 mt-4 w-full max-w-4xl justify-center">
        {/* 품절 상품 포함 체크박스 */}
        <div className="flex items-center gap-3 select-none">
          <label htmlFor="excludeOutOfStock" className="flex items-center gap-2 cursor-pointer group" style={{ userSelect: 'none' }}>
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
            <span className="text-base font-semibold transition-colors duration-200 text-[var(--foreground)]">품절 상품 포함</span>
          </label>
        </div>

        {/* 정렬 드롭다운 - 글래스 스타일 */}
        <div 
          ref={sortDropdownRef} 
          className="relative flex-shrink-0 select-none"
          style={{
            borderRadius: '999px',
            background: 'var(--modal-glass-bg,rgba(255,255,255,0.36))',
            border: '1.8px solid var(--modal-glass-border,rgba(85, 64, 64, 0.35))',
            boxShadow: '0 1.5px 10px 0 rgba(0,0,0,0.06)',
            backdropFilter: 'blur(9px)',
            WebkitBackdropFilter: 'blur(9px)',
            transition: 'background 0.4s, border 0.4s',
            position: 'relative',
            zIndex: 50
          }}
        >
          <button
            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
            className="flex items-center gap-2 px-5 py-1.5 text-sm bg-transparent focus:outline-none"
            style={{
              color: 'var(--foreground)',
              border: 'none',
              fontWeight: 500,
              borderRadius: 999,
              background: 'transparent',
              zIndex: 20
            }}
          >
            <span>{getCurrentSortLabel()}</span>
            <ChevronDown 
              className={`w-4 h-4 transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} 
            />
          </button>
          
          <AnimatePresence>
            {isSortDropdownOpen && (
              <motion.ul
                key="sort-dropdown"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 2, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 left-0 mt-2 py-1"
                style={{
                  borderRadius: 18,
                  background: document.documentElement.classList.contains('dark')
                    ? 'rgba(40,42,55,0.93)'
                    : 'rgba(245,245,250,0.92)',
                  color: 'var(--foreground)',
                  boxShadow: '0 4px 32px 0 rgba(0,0,0,0.11)',
                  border: '1.5px solid var(--input-border)',
                  overflow: 'hidden',
                  fontWeight: 500,
                  zIndex: 100
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <li
                    key={option.value}
                    onClick={() => onSortChange(option.value)}
                    style={{
                      padding: '11px 24px',
                      color: 'var(--text-secondary)',
                      background: sort === option.value
                        ? 'rgba(0,0,0,0.06)'
                        : 'transparent',
                      cursor: 'pointer',
                      fontWeight: sort === option.value ? 700 : 400,
                      transition: 'background 0.18s',
                      fontSize: 11,
                      letterSpacing: '-0.2px'
                    }}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && onSortChange(option.value)}
                  >
                    {option.label}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 상품 목록 */}
      <section className="w-full mt-8 max-w-4xl grid grid-cols-3 md:grid-cols-6 gap-2 justify-items-center">
        {pagedProducts.length === 0 && (
          <div className="col-span-3 md:col-span-6 text-center text-lg mt-16 text-[var(--text-secondary)]">
            해당 검색 결과가 없습니다.
          </div>
        )}
        {pagedProducts.map((item: Product) => (
          <div key={item.id} className={`${cardClass} group hover:scale-105 transition-all duration-300`}>
            <ShakeWrapper item={item}>
              <div 
                className="w-full h-[100px] md:h-[110px] mb-2 rounded-xl overflow-hidden bg-[var(--input-background)] relative"
                style={{
                  aspectRatio: '1 / 1',
                  minHeight: '100px',
                  maxHeight: '110px',
                  background: 'linear-gradient(135deg, var(--sobi-green-light) 0%, var(--input-background) 100%)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                <Link href={`/products/${item.id}`} className="w-full h-full block relative">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    className="object-cover group-hover:scale-110"
                    style={{ 
                      backgroundColor: 'var(--input-background)',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      borderRadius: '12px',
                      transition: 'all 0.3s ease'
                    }}
                    fill
                    priority={false}
                    loading="lazy"
                    sizes="(max-width: 768px) 90px, 90px"
                    quality={85}
                  />
                  {/* 그라데이션 오버레이 - 페이드아웃 효과 */}
                  <div 
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at center, transparent 60%, var(--gradient-overlay-dark) 100%)',
                      opacity: 0.8
                    }}
                  />
                  {/* 테두리 그라데이션 효과 */}
                  <div 
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, var(--gradient-shadow-light) 0%, transparent 50%, var(--gradient-shadow-dark) 100%)',
                      opacity: 0.6
                    }}
                  />
                </Link>
                {/* 할인 배지 */}
                {item.discountRate > 0 && (
                  <div className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    {item.discountRate}%
                  </div>
                )}
                {/* 찜 인디케이터 - 읽기전용 */}
                <FavoriteIcon productId={item.id} readOnly={true} />
              </div>
            </ShakeWrapper>
            <Link href={`/products/${item.id}`} className="w-full flex flex-col items-center">
              {item.discountRate > 0 ? (
                <div className={"flex flex-col items-center " + (item.stock === 0 ? "opacity-60 grayscale" : "")}>
                  <span className="text-[13px] text-gray-400 line-through opacity-70">
                    {formatPrice(item.price)}
                  </span>
                  <span className="text-[15px] font-extrabold text-red-700 -mt-1">
                    {formatPrice(calculateDiscountedPrice(item.price, item.discountRate))}
                  </span>
                </div>
              ) : (
                <span className={"block text-[15px] font-semibold text-center " + (item.stock === 0 ? "opacity-60 grayscale" : "")} style={{ color: 'var(--text-secondary)' }}>
                  {formatPrice(item.price)}
                </span>
              )}
            </Link>
          </div>
        ))}
      </section>

      {/* 페이지네이션 - 카테고리 페이지와 동일 */}
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
            }}
          >
            <ChevronLeft strokeWidth={1.5} />
          </button>
          {(() => {
            const pageNumbers: number[] = []
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
                aria-current={pageNum === currentPage ? 'page' : undefined}
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
            }}
          >
            <ChevronRight strokeWidth={1.5} />
          </button>
        </nav>
      )}
    </main>
  )
}
