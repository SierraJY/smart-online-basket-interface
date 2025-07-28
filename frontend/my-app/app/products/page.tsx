// 상품 전체 목록 페이지

'use client'

import { useMemo, useRef, createRef, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useProducts } from '@/utils/hooks/useProducts'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FaHeart, FaRegHeart } from "react-icons/fa";
import SearchBar from '@/components/SearchBar'
import ShakeWrapper from '@/components/ShakeWrapper'
import { useScrollRestore } from '@/store/useScrollRestore'
import { useAuthStore } from '@/store/useAuthStore'
import { getToken } from '@/utils/auth/authUtils'
import {
  addFavorite,
  removeFavorite,
  fetchFavorite,
} from '@/utils/api/favorite'

const CATEGORY_LIMIT = 10

export default function Page() {
  const { products, loading, error } = useProducts()
  useScrollRestore(!loading && products.length > 0)
  const searchParams = useSearchParams()
  const router = useRouter()

  // 쿼리스트링으로 상태 싱크!
  const keywordFromURL = useMemo(() => searchParams.get('keyword') || '', [searchParams])
  const categoryFromURL = useMemo(() => searchParams.get('category') || '전체', [searchParams])
  const [keyword, setKeyword] = useState(keywordFromURL)
  const [category, setCategory] = useState(categoryFromURL)
  const { favorite, setFavorite, isLoggedIn } = useAuthStore()
  const [excludeOutOfStock, setExcludeOutOfStock] = useState(false)
  const [FavoriteLoading, setFavoriteLoading] = useState(false)

  // 쿼리스트링이 바뀌면 input값도 동기화!
  useEffect(() => {
    setKeyword(keywordFromURL)
    setCategory(categoryFromURL)
  }, [keywordFromURL, categoryFromURL])

  // 로그인 시(또는 새로고침 시) Favorite 동기화!
  useEffect(() => {
    if (isLoggedIn && getToken()) {
      fetchFavorite()
        .then((data) => setFavorite(data.favoriteProducts.map((p: any) => p.id)))
        .catch(() => setFavorite([]))
    } else {
      setFavorite([])
    }
  }, [isLoggedIn])

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

  // 필터링
  const filtered = products.filter((item) => {
    const matchesKeyword =
      [item.name, item.description, item.category]
        .join(' ')
        .toLowerCase()
        .includes(keyword.toLowerCase())
    const matchesCategory = category === '전체' || item.category === category
    const matchesStock = !excludeOutOfStock || item.stock > 0
    return matchesKeyword && matchesCategory && matchesStock
  })

  const categoriesInFiltered = useMemo(
    () => [...new Set(filtered.map((p) => p.category))],
    [filtered]
  )

  const categorySections = category === '전체' ? categoriesInFiltered : [category]
  const sectionRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({})
  categorySections.forEach((cat) => {
    if (!sectionRefs.current[cat]) {
      sectionRefs.current[cat] = createRef<HTMLDivElement>()
    }
  })

  if (loading) return <div>로딩 중...</div>
  if (error) return <div>에러: {error.message}</div>
  const replaceCategoryName = (cat: string) => cat.replace(/_/g, '/')

  // 좌우 화살표 버튼
  const scrollByCard = (ref: React.RefObject<HTMLDivElement | null> | undefined, dir: number) => {
    if (!ref?.current) return
    const card = ref.current.querySelector('.item-card') as HTMLElement | null
    if (card) {
      const width = card.getBoundingClientRect().width + 24 // gap-6 == 24px
      ref.current.scrollBy({ left: dir * width, behavior: 'smooth' })
    }
  }

  // 찜 토글 버튼
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
      // 항상 최신화 (API 재조회)
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
      className="min-h-screen px-4 py-10 pb-24 flex flex-col items-center"
      style={{
        background: 'var(--input-background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s',
      }}
    >
      <h1 className="text-2xl font-bold mb-6 mt-10" style={{ color: 'var(--foreground)' }}>
        전체 상품 목록
      </h1>

      {/* 검색 & 카테고리 */}
      <SearchBar
        keyword={keyword}
        setKeyword={onKeywordChange}
        category={category}
        setCategory={onCategoryChange}
        onSearch={() => {}}
        showCategorySelect={true}
        showResultButton={false}
      />

      {/* 품절 상품 제외 토글 */}
      <div className="flex items-center gap-3 mb-6 mt-4 select-none">
        <label
          htmlFor="excludeOutOfStock"
          className="relative mb-1 inline-flex items-center cursor-pointer group"
          style={{ userSelect: "none" }}
        >
          <input
            type="checkbox"
            id="excludeOutOfStock"
            checked={excludeOutOfStock}
            onChange={e => setExcludeOutOfStock(e.target.checked)}
            className="sr-only peer"
          />
          <div
            className={`
              w-11 h-6 transition-all backdrop-blur-md
              peer-focus:outline-none rounded-full
              peer peer-checked:bg-[#5e0315] bg-[var(--text-secondary)]
              shadow-inner
            `}
            style={{
              boxShadow: '0 0 0 2px #42b88320',
            }}
          ></div>
          <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-md transition-transform
            peer-checked:translate-x-5"></div>
        </label>
        <span className="text-base font-semibold transition-colors duration-200 text-[var(--foreground)]">
          {excludeOutOfStock ? "품절 상품 제외" : "품절 상품 포함"}
        </span>
      </div>

      {/* 카테고리별 섹션 + 가로 스크롤 */}
      <div className="w-full mt-10 max-w-4xl">
        {categorySections.length === 0 && (
          <p className="text-lg text-center mt-10" style={{ color: 'var(--text-secondary)' }}>
            검색 결과가 없습니다
          </p>
        )}

        {categorySections.map((cat) => {
          const items = filtered.filter((item) => item.category === cat)
          if (items.length === 0) return null
          const scrollRef = sectionRefs.current[cat]!
          const showMore = items.length > CATEGORY_LIMIT

          return (
            <section key={cat} className="mb-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                  {replaceCategoryName(cat)}
                </h2>
                <Link
                  href={`/products/category?category=${encodeURIComponent(cat)}`}
                  className="ml-2 px-2 py-1 text-xs font-medium transition hover:scale-110"
                  style={{
                    color: 'var(--text-secondary)',
                    marginLeft: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                    fontWeight: 500,
                  }}
                >
                  {replaceCategoryName(cat)} 전체보기
                  <ChevronRight size={16}/>
                </Link>
              </div>
              <div className="relative">
                {/* 왼쪽 화살표 */}
                <button
                  type="button"
                  className="hidden md:flex absolute z-20 left-[-50px] top-1/2 -translate-y-1/2 rounded-full p-1 hover:scale-110 transition-all"
                  style={{ pointerEvents: 'auto' }}
                  onClick={() => scrollByCard(scrollRef, -1.5)}
                  tabIndex={-1.5}
                  aria-label="왼쪽으로 이동"
                >
                  <ChevronLeft size={26} />
                </button>
                {/* 상품 리스트 */}
                <div
                  ref={scrollRef}
                  className="flex overflow-x-auto gap-5 snap-x snap-mandatory -mx-1 scrollbar-none cursor-pointer"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    scrollBehavior: 'smooth',
                  }}
                >
                  {items.slice(0, CATEGORY_LIMIT).map((item) => (
                    <div
                      key={item.id}
                      className="item-card flex-shrink-0 w-[120px] h-[200px] md:w-[150px] md:h-[250px] snap-start flex flex-col items-center px-2 pt-2 pb-1 transition-all relative bg-transparent"
                    >
                      <ShakeWrapper item={item}>
                        <Link href={`/products/${item.id}`}>
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            className="object-contain w-full h-full rounded-2xl"
                            style={{ maxHeight: 110, maxWidth: 120, background: 'var(--input-background)' }}
                            width={24}
                            height={24}
                          />
                        </Link>
                      </ShakeWrapper>
                      <Link href={`/products/${item.id}`}>
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
                        {/* 가격 부분 */}
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
                      {/* 찜버튼 */}
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
                    </div>
                  ))}
                  {/* 더보기 카드 */}
                  {showMore && (
                    <Link
                      href={`/products/category?category=${encodeURIComponent(cat)}`}
                      className="flex-shrink-0 w-[100px] h-[100px] snap-start flex flex-col items-center justify-center
                        bg-[var(--input-background)] text-[var(--text-secondary)] hover:scale-110 transition-all font-semibold text-md cursor-pointer"
                      style={{
                        minHeight: '310px',
                        height: '310px',
                        alignItems: 'center',
                      }}
                    >
                      <span className="mb-1 text-3xl">+</span>
                      <span>더보기</span>
                    </Link>
                  )}
                </div>
                {/* 오른쪽 화살표 */}
                <button
                  type="button"
                  className="hidden md:flex absolute z-20 right-[-50px] top-1/2 -translate-y-1/2 rounded-full p-1 hover:scale-110 transition-all"
                  style={{ pointerEvents: 'auto' }}
                  onClick={() => scrollByCard(scrollRef, 1.5)}
                  tabIndex={-1.5}
                  aria-label="오른쪽으로 이동"
                >
                  <ChevronRight size={26} />
                </button>
              </div>
              <div className="w-full border-b border-[var(--input-border)] my-6" />
            </section>
          )
        })}
      </div>
    </main>
  )
}
