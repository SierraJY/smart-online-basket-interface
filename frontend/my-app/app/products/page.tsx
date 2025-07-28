// 상품 전체 목록 페이지

'use client'

import { useMemo, useRef, createRef, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useProducts } from '@/utils/hooks/useProducts'
import { toggleWishlist } from '@/utils/wishlistUtils'
import { useAuthStore } from '@/store/useAuthStore'
import { getToken } from '@/utils/auth/authUtils'
import Link from 'next/link'
import Image from 'next/image'
import { Check, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import SearchBar from '@/components/SearchBar'
import ShakeWrapper from '@/components/ShakeWrapper'

const CATEGORY_LIMIT = 10

export default function Page() {
  const { products, loading, error } = useProducts()
  const searchParams = useSearchParams()
  const keywordFromURL = useMemo(() => searchParams.get('keyword') || '', [searchParams])
  const categoryFromURL = useMemo(() => searchParams.get('category') || '전체', [searchParams])
  const [keyword, setKeyword] = useState(keywordFromURL)
  const [category, setCategory] = useState(categoryFromURL)
  const { email, wishlist, setWishlist } = useAuthStore()
  const [excludeOutOfStock, setExcludeOutOfStock] = useState(false)

  // 찜 추가 시 찜 목록에 저장 (localstorage로 임시 테스트)
  useEffect(() => {
    setKeyword(keywordFromURL)
    setCategory(categoryFromURL)
  }, [keywordFromURL, categoryFromURL])

  useEffect(() => {
    if (email) {
      const stored = localStorage.getItem(`wishlist-${email}`)
      setWishlist(stored ? JSON.parse(stored) : [])
    }
  }, [email])

  // 이하 기존 products 사용코드는 그대로!
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

  // 카테고리별 분류 (filtered 기준)
  const categoriesInFiltered = useMemo(
    () => [...new Set(filtered.map((p) => p.category))],
    [filtered]
  )

  const categorySections = category === '전체' ? categoriesInFiltered : [category]

  // ref를 map 밖에서 안전하게 객체로 관리 (타입 명시)
  const sectionRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({})

  // ref가 무조건 존재하도록 보장!
  categorySections.forEach((cat) => {
    if (!sectionRefs.current[cat]) {
      sectionRefs.current[cat] = createRef<HTMLDivElement>()
    }
  })

  if (loading) return <div>로딩 중...</div>
  if (error) return <div>에러: {error.message}</div>
  // 카테고리 언더바를 슬래쉬로 치환
  const replaceCategoryName = (cat: string) => cat.replace(/_/g, '/');

  // 화살표 클릭시 스크롤 함수 (타입 안전)
  const scrollByCard = (ref: React.RefObject<HTMLDivElement | null> | undefined, dir: number) => {
    if (!ref?.current) return
    const card = ref.current.querySelector('.item-card') as HTMLElement | null
    if (card) {
      const width = card.getBoundingClientRect().width + 28 // gap-7 == 28px
      ref.current.scrollBy({ left: dir * width, behavior: 'smooth' })
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

      {/* 검색창 & 카테고리 셀렉트 */}
      <SearchBar
        keyword={keyword}
        setKeyword={setKeyword}
        category={category}
        setCategory={setCategory}
        onSearch={() => {}}
        showCategorySelect={false}
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
          {/* 토글 배경 */}
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
            <section key={cat} className="mb-14">
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
              {/* 화살표: md(데스크탑) 이상에서만 노출 */}
              <div className="relative">
                {/* 왼쪽 화살표 */}
                <button
                  type="button"
                  className="hidden md:flex absolute z-20 left-[-50px] top-1/2 -translate-y-1/2 rounded-full p-1 hover:scale-110 transition-all"
                  style={{ pointerEvents: 'auto' }}
                  onClick={() => scrollByCard(scrollRef, -1)}
                  tabIndex={-1}
                  aria-label="왼쪽으로 이동"
                >
                  <ChevronLeft size={26} />
                </button>
                {/* 상품 리스트 */}
                <div
                  ref={scrollRef}
                  className="flex overflow-x-auto gap-7 snap-x snap-mandatory pb-2 -mx-1 scrollbar-none cursor-pointer"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    userSelect: 'none',
                    scrollBehavior: 'smooth',
                  }}
                >
                  {items.slice(0, CATEGORY_LIMIT).map((item) => (
                    <ShakeWrapper key={item.id} item={item}>
                      <Link href={`/products/${item.id}`}>
                        <div className="w-full h-[50px] flex items-center justify-center mb-2 rounded-xl overflow-hidden bg-[var(--input-background)]">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            className="object-contain w-full h-full"
                            style={{ maxHeight: 110, maxWidth: 120, background: 'var(--input-background)' }}
                            width={24}
                            height={24}
                          />
                        </div>
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
                      {/* 찜버튼 */}
                      <button
                        onClick={async (e) => {
                          e.preventDefault()
                          if (!getToken()) {
                            alert('로그인 후 이용 가능합니다.')
                            return
                          }
                          const updated = toggleWishlist(email, item.id)
                          setWishlist(updated)
                          // 찜 알림 띄우기 (푸쉬)
                          if (updated.includes(item.id)) {
                            if (Notification.permission === 'default') {
                              await Notification.requestPermission()
                            }
                            if (Notification.permission === 'granted') {
                              new Notification(`${item.name}을 찜했습니다!`, {
                                body: '내 찜목록에서 언제든 확인할 수 있어요',
                                icon: item.imageUrl || '/logo192.png'
                              })
                            }
                          }
                        }}
                        className="absolute top-2 right-2 text-lg px-1.5 py-1.5 rounded-full hover:scale-110 transition-all z-10"
                        title={wishlist.includes(item.id) ? '찜 해제' : '찜'}
                      >
                        {wishlist.includes(item.id)
                          ? <Check size={25} color="var(--foreground)" strokeWidth={2.25} />
                          : <Plus size={25} color="var(--foreground)" strokeWidth={2.25} />
                        }
                      </button>
                    </ShakeWrapper>
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
                  onClick={() => scrollByCard(scrollRef, 1)}
                  tabIndex={-1}
                  aria-label="오른쪽으로 이동"
                >
                  <ChevronRight size={26} />
                </button>
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
