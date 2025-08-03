// 메인 페이지

'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import { useProducts } from '@/utils/hooks/useProducts'
import { FaExclamationTriangle } from "react-icons/fa";
import { getPerformanceMonitor, logPerformanceInDev } from '@/utils/performance'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import ShakeWrapper from '@/components/ShakeWrapper'
import ProfileButton from '@/components/buttons/ProfileButton'

export default function Home() {
  const router = useRouter()
  const { products, loading, error } = useProducts()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('전체')
  
  // 마우스 드래그 스크롤을 위한 상태
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // 각 테마 섹션의 스크롤 컨테이너 ref
  const aiRecommendedRef = useRef<HTMLDivElement>(null)
  const discountRef = useRef<HTMLDivElement>(null)
  const popularRef = useRef<HTMLDivElement>(null)
  const featuredRef = useRef<HTMLDivElement>(null)

  // Intersection Observer 설정
  const [aiEndRef, aiEndInView] = useInView({
    threshold: 0.1,
    rootMargin: '0px'
  })

  const [discountEndRef, discountEndInView] = useInView({
    threshold: 0.1,
    rootMargin: '0px'
  })

  const [popularEndRef, popularEndInView] = useInView({
    threshold: 0.1,
    rootMargin: '0px'
  })

  const [featuredEndRef, featuredEndInView] = useInView({
    threshold: 0.1,
    rootMargin: '0px'
  })

  // 무한 스크롤 처리
  useEffect(() => {
    if (aiEndInView && aiRecommendedRef.current) {
      const container = aiRecommendedRef.current
      const itemWidth = 200 + 16 // 상품 너비 + gap
      const itemsPerSet = 15
      const setWidth = itemWidth * itemsPerSet
      
      // 현재 스크롤 위치에서 첫 번째 세트 너비만큼 뒤로 이동
      container.scrollLeft = container.scrollLeft - setWidth
    }
  }, [aiEndInView])

  useEffect(() => {
    if (discountEndInView && discountRef.current) {
      const container = discountRef.current
      const itemWidth = 200 + 16 // 상품 너비 + gap
      const itemsPerSet = 15
      const setWidth = itemWidth * itemsPerSet
      
      // 현재 스크롤 위치에서 첫 번째 세트 너비만큼 뒤로 이동
      container.scrollLeft = container.scrollLeft - setWidth
    }
  }, [discountEndInView])

  useEffect(() => {
    if (popularEndInView && popularRef.current) {
      const container = popularRef.current
      const itemWidth = 200 + 16 // 상품 너비 + gap
      const itemsPerSet = 15
      const setWidth = itemWidth * itemsPerSet
      
      // 현재 스크롤 위치에서 첫 번째 세트 너비만큼 뒤로 이동
      container.scrollLeft = container.scrollLeft - setWidth
    }
  }, [popularEndInView])

  useEffect(() => {
    if (featuredEndInView && featuredRef.current) {
      const container = featuredRef.current
      const itemWidth = 200 + 16 // 상품 너비 + gap
      const itemsPerSet = 15
      const setWidth = itemWidth * itemsPerSet
      
      // 현재 스크롤 위치에서 첫 번째 세트 너비만큼 뒤로 이동
      container.scrollLeft = container.scrollLeft - setWidth
    }
  }, [featuredEndInView])

  // 성능 모니터링 시작
  useEffect(() => {
    const monitor = getPerformanceMonitor();
    if (monitor) {
      monitor.startMeasure('HomePage-Mount');
    }
    
    return () => {
      const monitor = getPerformanceMonitor();
      if (monitor) {
        monitor.endMeasure('HomePage-Mount');
      }
      // 개발 환경에서 성능 데이터 로깅
      logPerformanceInDev();
    };
  }, []);

  // products에서 카테고리 추출 (products가 변경될 때만 연산)
  const categories = useMemo(
    () =>
      products && Array.isArray(products)
        ? ['전체', ...Array.from(new Set(products.map((p) => p.category)))]
        : ['전체'],
    [products]
  )

  // 테마별 상품 분류
  const themeProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return {}
    
    // 배열을 랜덤하게 섞는 함수
    const shuffleArray = (array: any[]) => {
      const shuffled = [...array]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }
    
    // 무한 스크롤을 위해 상품 배열을 복제하는 함수
    const createInfiniteArray = (array: any[]) => {
      // 원본 배열을 5번 반복하여 진정한 무한 스크롤 효과 생성
      return [...array, ...array, ...array, ...array, ...array, ...array, ...array, ...array, ...array, ...array]
    }
    
    // AI 추천 상품
    const aiRecommendedBase = shuffleArray(
      products.filter(p => p.stock > 0)
    ).slice(0, 15)
    
    // 할인 상품 (할인율 9% 이상, 재고 30개 이하)
    const discountBase = shuffleArray(
      products.filter(p => p.discountRate >= 9 && p.stock > 0 && p.stock <= 30)
    ).slice(0, 15)
    
    // 인기 상품 (판매량 100개 이상)
    const popularBase = shuffleArray(
      products.filter(p => p.sales >= 100 && p.stock > 0)
    ).slice(0, 15)
    
    // 건강 관리 제품 (건강 태그 포함, 가격 5만원 이상)
    const featuredBase = shuffleArray(
      products.filter(p => p.tag && p.tag.includes('건강') && p.price >= 50000 && p.stock > 0)
    ).slice(0, 15)
    
    return {
      // AI 추천 상품 (무한 스크롤)
      aiRecommended: createInfiniteArray(aiRecommendedBase),
      
      // 할인 상품 (무한 스크롤)
      discount: createInfiniteArray(discountBase),
      
      // 인기 상품 (무한 스크롤)
      popular: createInfiniteArray(popularBase),
      
      // 건강 관리 제품 (무한 스크롤)
      featured: createInfiniteArray(featuredBase)
    }
  }, [products])

  const handleSearch = () => {
    if (!keyword.trim()) return
    const query = new URLSearchParams()
    query.set('keyword', keyword)
    if (category && category !== '전체') {
      query.set('category', category)
    }
    router.push(`/products?${query.toString()}`)
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

  // 커스텀 훅 사용할 때 로딩 시 에러 처리
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ 
        background: 'linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)), url("/paper2.jpg")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: 'var(--foreground)' 
      }}
    >
      <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
      <div className="text-lg font-semibold text-[var(--foreground)]">메인 페이지로 이동 중...</div>
      <div className="text-sm text-gray-400 mt-1">조금만 기다려 주세요!</div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[250px] py-10 text-center"
      style={{ 
        background: 'linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)), url("/paper2.jpg")',
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
  );

  return (
    <main className="min-h-screen py-16 pb-28 flex flex-col items-center"
      style={{ 
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}
    >
      <div className="w-full max-w-4xl">
        {/* 헤더 */}
        <div className="text-center mb-12 relative">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--sobi-green)' }}>
            SOBI
          </h1>
          <ProfileButton />
        </div>

        {/* 테마별 상품 섹션들 */}
        <div className="space-y-6">
          {/* AI 추천 상품 */}
          {themeProducts.aiRecommended && themeProducts.aiRecommended.length > 0 && (
            <section>
              <div className="relative flex justify-center items-center mb-8">
                <h2 className="text-3xl font-bold">AI추천</h2>
                <Link href="/products" className="absolute right-8 inline-flex items-center text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--sobi-green)' }}>
                  전체보기
                  <ChevronRight size={16} />
                </Link>
              </div>
              <div 
                className="flex overflow-x-auto gap-4 scrollbar-none drag-scroll-container"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                ref={aiRecommendedRef}
              >
                {themeProducts.aiRecommended.map((product, index) => {
                  // 다양한 기울기 적용 (0도, -3도, 3도, -2도, 2도 순환)
                  const rotations = [-2, -1, 3.5, -2, 2, -1, 1, -4, 4, -2.5, 2.5, -1.5, 0, -3.5, 3.5]
                  const rotation = rotations[index % rotations.length]
                  
                  return (
                    <div key={`ai-${product.id}-${index}`} className="flex-shrink-0 py-2">
                      <ShakeWrapper item={product}>
                        <Link href={`/products/${product.id}`}>
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={200}
                            height={174}
                            className="w-[200px] h-[174px] object-cover rounded-2xl hover:scale-105 transition-transform duration-200 shadow-lg"
                            style={{
                              transform: `rotate(${rotation}deg)`,
                              transformOrigin: 'center'
                            }}
                          />
                        </Link>
                      </ShakeWrapper>
                    </div>
                  )
                })}
                {/* 무한 스크롤 관찰 요소 */}
                <div ref={aiEndRef} className="flex-shrink-0 w-1 h-1" />
              </div>
            </section>
          )}

                    {/* 할인 상품 */}
          {themeProducts.discount && themeProducts.discount.length > 0 && (
            <section>
              <div className="text-center mb-4">
                <h2 className="text-3xl font-semibold" style={{ fontFamily: 'Yeongwol, sans-serif', color: '#a91f0d' }}>
                  먼저 줍는 사람이 임자!
                </h2>
              </div>
              <div 
                className="flex overflow-x-auto gap-4 scrollbar-none drag-scroll-container"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                ref={discountRef}
              >
                {themeProducts.discount.map((product, index) => {
                  // 다양한 기울기 적용 (할인 상품은 더 역동적으로)
                  const rotations = [3, -4, 4, -2, 2.5, -5, 4.5, -2, 3, -3, 3, -3.5, 1.5, -2.5, 1.5]
                  const rotation = rotations[index % rotations.length]
                  
                  return (
                    <div key={`discount-${product.id}-${index}`} className="flex-shrink-0 py-2">
                      <ShakeWrapper item={product}>
                        <Link href={`/products/${product.id}`}>
                          <div className="relative">
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              width={200}
                              height={154}
                              className="w-[200px] h-[154px] object-cover rounded-2xl hover:scale-105 transition-transform duration-200 shadow-lg"
                              style={{
                                transform: `rotate(${rotation}deg)`,
                                transformOrigin: 'center'
                              }}
                            />
                            {/* 할인 배지 - 이미지와 같은 방향으로 기울어지되 위치는 고정 */}
                            {product.discountRate > 0 && (
                              <div 
                                className="absolute bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg"
                                style={{
                                  top: '8px',
                                  right: '8px',
                                  transform: `rotate(${rotation}deg)`,
                                  transformOrigin: 'center'
                                }}
                              >
                                {product.discountRate}%
                              </div>
                            )}
                          </div>
                        </Link>
                      </ShakeWrapper>
                    </div>
                  )
                })}
                {/* 무한 스크롤 관찰 요소 */}
                <div ref={discountEndRef} className="flex-shrink-0 w-1 h-1" />
              </div>
            </section>
          )}

          {/* 인기 상품 */}
          {themeProducts.popular && themeProducts.popular.length > 0 && (
            <section>
              <div className="text-center mb-4">
                <h2 className="text-3xl font-normal" style={{ fontFamily: 'Jejudoldam, sans-serif', color: 'var(--sobi-green)' }}>
                  이게 잘나간대
                </h2>
              </div>
              <div 
                className="flex overflow-x-auto gap-4 scrollbar-none drag-scroll-container"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                ref={popularRef}
              >
                {themeProducts.popular.map((product, index) => {
                  // 다양한 기울기 적용 (인기 상품은 중간 정도의 기울기)
                  const rotations = [0, -2, 2, -1, 1, -3, 2, -0.5, 1.5, -2.5, 2.5, -1.5, 0.5, -2, 1.5]
                  const rotation = rotations[index % rotations.length]
                  
                  return (
                    <div key={`popular-${product.id}-${index}`} className="flex-shrink-0 py-2">
                      <ShakeWrapper item={product}>
                        <Link href={`/products/${product.id}`}>
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={200}
                            height={154}
                            className="w-[200px] h-[154px] object-cover rounded-2xl hover:scale-105 transition-transform duration-200 shadow-lg"
                            style={{
                              transform: `rotate(${rotation}deg)`,
                              transformOrigin: 'center'
                            }}
                          />
                        </Link>
                      </ShakeWrapper>
                    </div>
                  )
                })}
                {/* 무한 스크롤 관찰 요소 */}
                <div ref={popularEndRef} className="flex-shrink-0 w-1 h-1" />
              </div>
            </section>
          )}


                               {/* 추천 상품 */}
          {themeProducts.featured && themeProducts.featured.length > 0 && (
            <section>
              <div className="text-center mb-2">
                <h2 className="text-3xl font-bold" style={{ fontFamily: 'Hangul, sans-serif' }}>
                  효도 하셔야죠
                </h2>
              </div>
              <div 
                className="flex overflow-x-auto gap-4 scrollbar-none drag-scroll-container"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                ref={featuredRef}
              >
                {themeProducts.featured.map((product, index) => {
                  // 다양한 기울기 적용 (건강 상품은 부드러운 기울기)
                  const rotations = [0, -1.5, 1.5, -0.8, 0.8, -2.2, 2.2, -0.3, 0.3, -1.8, 1.8, -1.2, 1.2, -2.8, 2.8]
                  const rotation = rotations[index % rotations.length]
                  
                  return (
                    <div key={`featured-${product.id}-${index}`} className="flex-shrink-0 py-2">
                      <ShakeWrapper item={product}>
                        <Link href={`/products/${product.id}`}>
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={200}
                            height={154}
                            className="w-[200px] h-[154px] object-cover rounded-2xl hover:scale-105 transition-transform duration-200 shadow-lg"
                            style={{
                              transform: `rotate(${rotation}deg)`,
                              transformOrigin: 'center'
                            }}
                          />
                        </Link>
                      </ShakeWrapper>
                    </div>
                  )
                })}
                {/* 무한 스크롤 관찰 요소 */}
                <div ref={featuredEndRef} className="flex-shrink-0 w-1 h-1" />
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}


