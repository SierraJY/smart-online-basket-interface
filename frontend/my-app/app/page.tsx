// 메인 페이지

'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import { useProducts } from '@/utils/hooks/useProducts'
import { FaExclamationTriangle } from "react-icons/fa";
import { getPerformanceMonitor, logPerformanceInDev } from '@/utils/performance'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import ShakeWrapper from '@/components/ShakeWrapper'
import ProfileButton from '@/components/buttons/ProfileButton'
import { CATEGORY_ICONS } from '@/components/categoryIcons'
import { motion, AnimatePresence } from 'framer-motion'
import { Product } from '@/types'
import { CategoryName } from '@/components/categoryIcons'

export default function Home() {
  const { products, loading, error } = useProducts()
  
  // 광고 배너 관련 상태
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  
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
  const [, aiEndInView] = useInView({
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

  // 무한 스크롤 처리 (극한 성능 최적화 v2)
  const handleInfiniteScroll = (ref: React.RefObject<HTMLDivElement | null>, inView: boolean) => {
    if (inView && ref.current) {
      const container = ref.current
      const itemWidth = 140 + 8 // 상품 너비 + gap (160 → 140으로 줄임)
      const itemsPerSet = 8 // 10개 → 8개로 줄임
      const setWidth = itemWidth * itemsPerSet
      
      // 현재 스크롤 위치에서 첫 번째 세트 너비만큼 뒤로 이동
      container.scrollLeft = container.scrollLeft - setWidth
    }
  }

  useEffect(() => {
    handleInfiniteScroll(aiRecommendedRef, aiEndInView)
  }, [aiEndInView])

  useEffect(() => {
    handleInfiniteScroll(discountRef, discountEndInView)
  }, [discountEndInView])

  useEffect(() => {
    handleInfiniteScroll(popularRef, popularEndInView)
  }, [popularEndInView])

  useEffect(() => {
    handleInfiniteScroll(featuredRef, featuredEndInView)
  }, [featuredEndInView])

  // 성능 모니터링 시작 (개발 환경에서만)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
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
    }
    // 개발 환경이 아닌 경우 빈 cleanup 함수 반환
    return () => {};
  }, []);

  // 카테고리 배열 정의 (15개)
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

  // 광고 배너 데이터 (성능 최적화 - 첫 번째만 즉시 로드)
  const adBanners = useMemo(() => [
    { id: 1, image: '/ad/banner1.png', priority: true },
    { id: 2, image: '/ad/banner2.png', priority: false },
    { id: 3, image: '/ad/banner3.png', priority: false },
    { id: 4, image: '/ad/banner4.png', priority: false },
  ], [])

  // 광고 배너 자동 슬라이드
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % adBanners.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, adBanners.length])

  // 광고 배너 수동 제어 함수들
  const goToNext = () => {
    setSlideDirection('right')
    setCurrentAdIndex((prev) => (prev + 1) % adBanners.length)
    setIsAutoPlaying(false)
    // 3초 후 자동 재개
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  const goToPrev = () => {
    setSlideDirection('left')
    setCurrentAdIndex((prev) => (prev - 1 + adBanners.length) % adBanners.length)
    setIsAutoPlaying(false)
    // 3초 후 자동 재개
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  const goToSlide = (index: number) => {
    setSlideDirection(index > currentAdIndex ? 'right' : 'left')
    setCurrentAdIndex(index)
    setIsAutoPlaying(false)
    // 3초 후 자동 재개
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  // 모바일 감지
  const [isMobile, setIsMobile] = useState(false)
  const mobileBannerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 모바일 배너 자동 스크롤
  useEffect(() => {
    if (!isMobile || !mobileBannerRef.current) return

    const interval = setInterval(() => {
      if (mobileBannerRef.current) {
        const container = mobileBannerRef.current
        const clientWidth = container.clientWidth
        const currentScroll = container.scrollLeft
        const totalBanners = adBanners.length
        
        // 현재 배너 인덱스 계산
        const currentIndex = Math.round(currentScroll / clientWidth)
        
        // 다음 배너 인덱스 (순환)
        const nextIndex = (currentIndex + 1) % totalBanners
        
        // 다음 배너로 부드럽게 이동
        container.scrollTo({
          left: nextIndex * clientWidth,
          behavior: 'smooth'
        })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isMobile, adBanners.length])

  // 테마별 상품 분류 (극한 성능 최적화 v2)
  const themeProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return {}
    
    // 상품 필터링을 한 번에 처리하여 성능 향상
    const availableProducts = products.filter(p => p.stock > 0)
    
    // 더 빠른 랜덤 선택 함수 (Math.random() 최소화)
    const getRandomItems = (array: Product[], count: number) => {
      if (array.length <= count) return array
      const result: Product[] = []
      const indices = new Set<number>()
      while (indices.size < count) {
        indices.add(Math.floor(Math.random() * array.length))
      }
      indices.forEach(index => result.push(array[index]))
      return result
    }
    
    // 무한 스크롤을 위해 상품 배열을 복제하는 함수 (메모리 최적화)
    const createInfiniteArray = (array: Product[]) => {
      // 원본 배열을 1번만 반복하여 메모리 사용량 극한 줄임
      return array.length > 0 ? [...array, ...array] : []
    }
    
    // AI 추천 상품 (10개 → 8개로 줄임)
    const aiRecommendedBase = getRandomItems(availableProducts, 8)
    
    // 할인 상품 (10개 → 8개로 줄임)
    const discountBase = getRandomItems(
      availableProducts.filter(p => p.discountRate >= 9 && p.stock <= 10), 8
    )
    
    // 인기 상품 (10개 → 8개로 줄임)
    const popularBase = getRandomItems(
      availableProducts.filter(p => p.sales >= 100), 8
    )
    
    // 건강 관리 제품 (10개 → 8개로 줄임)
    const featuredBase = getRandomItems(
      availableProducts.filter(p => p.tag?.includes('건강') && p.price >= 50000), 8
    )
    
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

  // 검색 로직 구현 예정
  // const handleSearch = () => {
  //   if (!keyword.trim()) return
  //   const query = new URLSearchParams()
  //   query.set('keyword', keyword)
  //   if (category && category !== '전체') {
  //     query.set('category', category)
  //   }
  //   router.push(`/products?${query.toString()}`)
  // }

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
          backgroundColor: 'var(--background)',
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
  );

  return (
    <main className="min-h-screen py-16 pb-24 flex flex-col items-center"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}
    >
      <style jsx>{`
        .mobile-banner-scroll {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .mobile-banner-scroll::-webkit-scrollbar {
          display: none;
        }
        .mobile-banner-item {
          scroll-snap-align: center;
          min-width: 100%;
          flex-shrink: 0;
        }
        /* 터치 스크롤 동작 개선 */
        .mobile-banner-scroll {
          touch-action: pan-x;
          overscroll-behavior-x: contain;
        }
        /* 폰트 로딩 최적화 */
        @font-face {
          font-family: 'Yeongwol';
          font-display: swap;
          src: url('/_next/static/media/Yeongwol.abeae2e6.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Jejudoldam';
          font-display: swap;
          src: url('/_next/static/media/jejudoldam.8c3dd4db.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Hangul';
          font-display: swap;
          src: url('/_next/static/media/hangul.e80bed9e.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Ownglyph_daelong';
          font-display: swap;
          src: url('/_next/static/media/Ownglyph_daelong-Rg.78b4d39e.ttf') format('truetype');
        }
          
      `}</style>
      <div className="pt-4 w-full max-w-4xl">
        {/* 상단 헤더 */}
        <div className="flex justify-between items-center mb-6 px-5">
          <ProfileButton />
        </div>

        {/* 카테고리 섹션 */}
        <div className="mb-8 pt-2 px-5">
          <div className="grid grid-cols-5 gap-3 max-w-2xl mx-auto">
            {categories.map((category, index) => {
              const categoryName = category.replace(/_/g, '/')
              const backgroundColor = categoryColors[index]
              
              return (
                <Link
                  key={category}
                  href={category === '전체' ? '/products' : `/products/category?category=${encodeURIComponent(category)}`}
                  className="flex flex-col items-center group"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-110"
                    style={{ backgroundColor }}
                  >
                    <div className="text-white">
                      {CATEGORY_ICONS[category]}
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-center text-[var(--foreground)] group-hover:text-[var(--sobi-green)] transition-colors">
                    {categoryName}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* 광고 배너 섹션 */}
        <div className="mb-8">
          <div className="relative w-full max-w-4xl mx-auto">
            {/* 데스크톱용 메인 배너 */}
            {!isMobile && (
              <div className="relative w-full aspect-[18/9] overflow-hidden rounded-2xl shadow-lg">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentAdIndex}
                    initial={{ 
                      opacity: 0, 
                      x: slideDirection === 'right' ? 100 : -100 
                    }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ 
                      opacity: 0, 
                      x: slideDirection === 'right' ? -100 : 100 
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={adBanners[currentAdIndex].image}
                      alt={`광고 배너 ${currentAdIndex + 1}`}
                      fill
                      className="object-cover"
                      priority={adBanners[currentAdIndex].priority}
                      sizes="(max-width: 768px) 100vw, 1200px"
                      quality={75}
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                    />
                  </motion.div>
                </AnimatePresence>

                {/* 좌우 네비게이션 버튼 */}
                <button
                  onClick={goToPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
                >
                  <ChevronRight size={20} />
                </button>

                {/* 페이지네이션 점들 */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {adBanners.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentAdIndex
                          ? 'bg-white scale-125'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 모바일용 스와이프 배너 */}
            {isMobile && (
              <div 
                ref={mobileBannerRef}
                className="mobile-banner-scroll flex overflow-x-auto"
                style={{
                  scrollSnapType: 'x mandatory',
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {adBanners.map((banner, index) => (
                  <div
                    key={banner.id}
                    className="mobile-banner-item w-full aspect-[18/9] relative overflow-hidden shadow-lg"
                    style={{
                      scrollSnapAlign: 'center',
                      minWidth: '100%',
                      flexShrink: 0
                    }}
                  >
                    <Image
                      src={banner.image}
                      alt={`광고 배너 ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 1200px"
                      quality={75}
                      priority={banner.priority}
                      loading={banner.priority ? "eager" : "lazy"}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 로고 섹션 */}
        <div className="pb-8 text-center mb-6 relative">
          <div className="text-[65px] flex justify-center items-center">
            <motion.span
              style={{ 
                color: 'var(--sobi-green)',
                fontFamily: 'LOTTERIACHAB, sans-serif',
                cursor: 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                WebkitTextStroke: '1px rgba(0,0,0,0.8)',
                filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
              }}
              animate={{ 
                rotate: -28,
                x: [0, -2, 2, -1, 0],
                y: [0, -1, 1, -0.5, 0]
              }}
              transition={{
                rotate: { duration: 0 },
                x: { 
                  duration: 0.5, 
                  repeat: Infinity, 
                  repeatDelay: 8,
                  ease: "easeInOut"
                },
                y: { 
                  duration: 0.5, 
                  repeat: Infinity, 
                  repeatDelay: 8,
                  ease: "easeInOut"
                }
              }}
              onTap={() => {
                // S 클릭 시 애니메이션
              }}
              whileTap={{
                scale: 1.6,
                rotate: -8,
                color: '#1d783e',
                transition: {
                  duration: 0.5,
                  ease: "easeOut"
                }
              }}
            >
              S
            </motion.span>
            
            <motion.span
              style={{ 
                color: 'var(--sobi-green)',
                fontFamily: 'LOTTERIACHAB, sans-serif',
                cursor: 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                WebkitTextStroke: '1px rgba(0,0,0,0.8)',
                filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
              }}
              animate={{ 
                rotate: 25,
                x: [0, 2, -2, 1, 0],
                y: [0, 1, -1, 0.5, 0]
              }}
              transition={{
                rotate: { duration: 0 },
                x: { 
                  duration: 0.4, 
                  repeat: Infinity, 
                  repeatDelay: 10,
                  ease: "easeInOut"
                },
                y: { 
                  duration: 0.4, 
                  repeat: Infinity, 
                  repeatDelay: 10,
                  ease: "easeInOut"
                }
              }}
              onTap={() => {
                // O 클릭 시 애니메이션
              }}
              whileTap={{
                scale: 1.6,
                rotate: -15,
                color: '#1d783e',
                transition: {
                  duration: 1,
                  ease: "easeOut"
                }
              }}
            >
              O
            </motion.span>
            
            <motion.span
              style={{ 
                color: 'var(--sobi-green)',
                fontFamily: 'LOTTERIACHAB, sans-serif',
                cursor: 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                WebkitTextStroke: '1px rgba(0,0,0,0.8)',
                filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
              }}
              animate={{ 
                rotate: 10,
                x: [0, -1.5, 1.5, -0.75, 0],
                y: [0, -0.75, 0.75, -0.375, 0]
              }}
              transition={{
                rotate: { duration: 0 },
                x: { 
                  duration: 0.6, 
                  repeat: Infinity, 
                  repeatDelay: 12,
                  ease: "easeInOut"
                },
                y: { 
                  duration: 0.6, 
                  repeat: Infinity, 
                  repeatDelay: 12,
                  ease: "easeInOut"
                }
              }}
              onTap={() => {
                // B 클릭 시 애니메이션
              }}
              whileTap={{
                scale: 1.4,
                rotate: -10,
                color: '#1d783e',
                transition: {
                  duration: 0.3,
                  ease: "easeOut"
                }
              }}
            >
              B
            </motion.span>
            
            <motion.span
              style={{ 
                color: 'var(--sobi-green)',
                fontFamily: 'LOTTERIACHAB, sans-serif',
                cursor: 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                WebkitTextStroke: '1px rgba(0,0,0,0.8)',
                filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
              }}
              animate={{ 
                rotate: -13,
                x: [0, 1.5, -1.5, 0.75, 0],
                y: [0, -1, 1, -0.5, 0]
              }}
              transition={{
                rotate: { duration: 0 },
                x: { 
                  duration: 0.35, 
                  repeat: Infinity, 
                  repeatDelay: 9,
                  ease: "easeInOut"
                },
                y: { 
                  duration: 0.35, 
                  repeat: Infinity, 
                  repeatDelay: 9,
                  ease: "easeInOut"
                }
              }}
              onTap={() => {
                // I 클릭 시 애니메이션
              }}
              whileTap={{
                scale: 1.8,
                rotate: 10,
                color: '#1d783e',
                transition: {
                  duration: 1.2,
                  ease: "easeOut"
                }
              }}
            >
              I
            </motion.span>
          </div>
        </div>

        {/* 테마별 상품 섹션들 */}
        <div className="space-y-4">

          {/* 할인 상품 */}
          {themeProducts.discount && themeProducts.discount.length > 0 && !loading && (
            <section>
              <div className="text-center mb-2">
                <h2 className="text-3xl font-semibold" style={{ fontFamily: 'Yeongwol, sans-serif', color: '#a91f0d' }}>
                  먼저 줍는 사람이 임자!
                </h2>
              </div>
              <div 
                className="flex overflow-x-auto overflow-y-hidden gap-2 scrollbar-none drag-scroll-container"
                style={{ maxHeight: 130 }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                ref={discountRef}
              >
                {themeProducts.discount.map((product, index) => {
                  // 할인 상품 전용 기울기
                  const rotations = [3, -4, 4, -2, 2.5, -5, 4.5, -2]
                  const rotation = rotations[index % rotations.length]
                  
                  return (
                    <div key={`discount-${product.id}-${index}`} className="flex-shrink-0 py-1">
                      <ShakeWrapper item={product}>
                        <Link href={`/products/${product.id}`}>
                          <div className="relative">
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              width={140}
                              height={110}
                              className="w-[140px] h-[110px] object-cover rounded-2xl hover:scale-105 transition-transform duration-200 shadow-lg"
                              style={{
                                transform: `rotate(${rotation}deg)`,
                                transformOrigin: 'center'
                              }}
                              sizes="(max-width: 768px) 200px, 200px"
                              quality={75}
                              loading="lazy"
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
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
          {themeProducts.popular && themeProducts.popular.length > 0 && !loading && (
            <section>
              <div className="text-center mb-2">
                <h2 className="text-3xl font-normal" style={{ fontFamily: 'Jejudoldam, sans-serif', color: 'var(--sobi-green)' }}>
                  이게 잘나간대
                </h2>
              </div>
              <div 
                className="flex overflow-x-auto overflow-y-hidden gap-2 scrollbar-none drag-scroll-container"
                style={{ maxHeight: 130 }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                ref={popularRef}
              >
                {themeProducts.popular.map((product, index) => {
                  // 다양한 기울기 적용 (8개로 줄임)
                  const rotations = [3, -4.5, 2, -3, 7, -4, 2, -6.5]
                  const rotation = rotations[index % rotations.length]
                  
                  return (
                    <div key={`popular-${product.id}-${index}`} className="flex-shrink-0 py-1">
                      <ShakeWrapper item={product}>
                        <Link href={`/products/${product.id}`}>
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={140}
                            height={110}
                            className="w-[140px] h-[110px] object-cover rounded-2xl hover:scale-105 transition-transform duration-200 shadow-lg"
                            style={{
                              transform: `rotate(${rotation}deg)`,
                              transformOrigin: 'center'
                            }}
                            sizes="(max-width: 768px) 140px, 140px"
                            quality={75}
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
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
          {themeProducts.featured && themeProducts.featured.length > 0 && !loading && (
            <section>
              <div className="text-center mb-2">
                <h2 className="text-3xl font-bold" style={{ fontFamily: 'Hangul, sans-serif' }}>
                  효도 하셔야죠
                </h2>
              </div>
              <div 
                className="flex overflow-x-auto overflow-y-hidden gap-2 scrollbar-none drag-scroll-container"
                style={{ maxHeight: 130 }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                ref={featuredRef}
              >
                {themeProducts.featured.map((product, index) => {
                  // 다양한 기울기 적용 (8개로 줄임)
                  const rotations = [0, -2.5, 3.5, -1.8, 0.8, -2.2, 0.7, -0.4]
                  const rotation = rotations[index % rotations.length]
                  
                  return (
                    <div key={`featured-${product.id}-${index}`} className="flex-shrink-0 py-1">
                      <ShakeWrapper item={product}>
                        <Link href={`/products/${product.id}`}>
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={140}
                            height={110}
                            className="w-[140px] h-[110px] object-cover rounded-2xl hover:scale-105 transition-transform duration-200 shadow-lg"
                            style={{
                              transform: `rotate(${rotation}deg)`,
                              transformOrigin: 'center'
                            }}
                            sizes="(max-width: 768px) 140px, 140px"
                            quality={75}
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
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


