// 태그별 상품 목록 페이지

'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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

// 정렬 옵션 타입 정의
type SortOption = 'id' | 'sales' | 'discount_rate' | 'price_high' | 'price_low'

// 정렬 옵션 상수
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'id', label: '최신순' },
  { value: 'sales', label: '판매순' },
  { value: 'discount_rate', label: '할인율 높은순' },
  { value: 'price_high', label: '가격높은순' },
  { value: 'price_low', label: '가격낮은순' }
]

export default function TagPage() {
  const { products, loading, error } = useProducts()
  const searchParams = useSearchParams()
  const router = useRouter()
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  const tagFromURL = useMemo(() => searchParams.get('tag') || '', [searchParams])
  const keywordFromURL = useMemo(() => searchParams.get('keyword') || '', [searchParams])
  const sortFromURL = useMemo(() => (searchParams.get('sort') as SortOption) || 'id', [searchParams])
  const excludeOutOfStockFromURL = useMemo(() => searchParams.get('excludeOutOfStock') === 'true', [searchParams])
  
  const [keyword, setKeyword] = useState<string>(keywordFromURL)
  const [sort, setSort] = useState<SortOption>(sortFromURL)
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState<boolean>(false)
  const [excludeOutOfStock, setExcludeOutOfStock] = useState<boolean>(excludeOutOfStockFromURL)
  
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const [itemsPerPage, setItemsPerPage] = useState<number>(12) // 기본값 12

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

  // 쿼리스트링 sync
  useEffect(() => {
    setKeyword(keywordFromURL)
    setSort(sortFromURL)
    setExcludeOutOfStock(excludeOutOfStockFromURL)
  }, [keywordFromURL, sortFromURL, excludeOutOfStockFromURL])

  const onKeywordChange = (val: string) => {
    setKeyword(val)
    const params = new URLSearchParams(searchParams)
    params.set('keyword', val)
    params.set('page', '1') // 검색 시 첫 페이지로 이동
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

  // 태그 파싱 함수
  const parseTags = (tagString: string) => {
    if (!tagString) return [];
    return tagString.split(' ').filter(tag => tag.startsWith('#'));
  };

  // 필터링
  const filtered: Product[] = products.filter((item: Product) => {
    const matchesKeyword =
      [item.name, item.description, item.category]
        .join(' ')
        .toLowerCase()
        .includes(keyword.toLowerCase())
    const matchesStock = !excludeOutOfStock || item.stock > 0
    
    // 태그 매칭
    const itemTags = parseTags(item.tag || '')
    const matchesTag = tagFromURL ? itemTags.some(tag => tag === tagFromURL) : true
    
    return matchesKeyword && matchesStock && matchesTag
  })

  // 정렬 함수
  const sortedProducts = useMemo(() => {
    const sorted = [...filtered]
    
    switch (sort) {
      case 'id':
        // 최신순 (id 내림차순)
        return sorted.sort((a, b) => b.id - a.id)
      case 'sales':
        // 판매순 (sales 내림차순)
        return sorted.sort((a, b) => (b.sales || 0) - (a.sales || 0))
      case 'discount_rate':
        // 할인율 높은순 (discount_rate 내림차순)
        return sorted.sort((a, b) => (b.discountRate || 0) - (a.discountRate || 0))
      case 'price_high':
        // 가격높은순 (price 내림차순)
        return sorted.sort((a, b) => b.price - a.price)
      case 'price_low':
        // 가격낮은순 (price 오름차순)
        return sorted.sort((a, b) => a.price - b.price)
      default:
        return sorted
    }
  }, [filtered, sort])

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / itemsPerPage))
  const pagedProducts: Product[] = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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
      <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
      <div className="text-lg font-semibold text-[var(--foreground)]">태그별 상품 목록을 불러오는 중...</div>
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
      {/* 헤더 */}
      <h1 className="text-2xl font-bold mb-6 mt-10" style={{ color: 'var(--sobi-green)' }}>
        {tagFromURL.replace('#', '# ')}
      </h1>
      {/* SearchBar */}
      <SearchBar
        keyword={keyword}
        setKeyword={onKeywordChange}
        category="전체"
        setCategory={() => {}}
        onSearch={() => {}}
        showCategorySelect={false}
        showResultButton={false}
      />
      
      {/* 필터 옵션들 */}
      <div className="flex items-center gap-4 mb-6 mt-4 w-full max-w-4xl justify-center">
        {/* 품절 상품 제외 체크박스 */}
        <div className="flex items-center gap-3 select-none">
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

        {/* 정렬 드롭다운 - SearchBar와 통일된 디자인 */}
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
            className="flex items-center gap-2 px-5 py-3 text-sm bg-transparent focus:outline-none"
            style={{
              color: 'var(--foreground)',
              border: 'none',
              fontWeight: 500,
              borderRadius: 99,
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
            해당 태그의 상품이 없습니다.
          </div>
        )}
        {pagedProducts.map((item: Product) => (
          <div key={item.id} className={`${cardClass} group hover:scale-105 transition-all duration-300`}>
            <ShakeWrapper item={item}>
              <div className="w-full h-[100px] md:h-[110px] flex items-center justify-center mb-2 rounded-xl overflow-hidden relative"
                style={{
                  background: 'linear-gradient(135deg, var(--sobi-green-light) 0%, var(--input-background) 100%)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}>
                <Link href={`/products/${item.id}`} className="w-full h-full flex items-center justify-center">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={90}
                    height={80}
                    className="object-cover w-full h-full rounded-xl group-hover:scale-110"
                    style={{ 
                      backgroundColor: 'var(--input-background)',
                      transition: 'all 0.3s ease'
                    }}
                    loading="lazy"
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
                {/* 찜 인디케이터 */}
                <FavoriteIcon productId={item.id} readOnly={true} />
              </div>
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