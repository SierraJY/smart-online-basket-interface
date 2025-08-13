// 찜 목록 페이지

'use client'

import { useEffect, useState, useMemo, useRef } from 'react';

import Link from "next/link";
import Image from "next/image";
import { FaExclamationTriangle } from "react-icons/fa";
import { useAuth } from '@/utils/hooks/useAuth'
import { useFavorite } from "@/utils/hooks/useFavorite";
import { useProducts, Product } from "@/utils/hooks/useProducts";

import { CATEGORY_ICONS, CategoryName } from '@/components/categoryIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ShakeWrapper from '@/components/ShakeWrapper';

export default function FavoritePage() {
  // CSS 애니메이션 정의
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slowPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 카테고리 상태 관리
  const [selectedCategory, setSelectedCategory] = useState<CategoryName>('전체');
  
  // 마우스 드래그 스크롤을 위한 상태
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // 상품 선택 상태 (말풍선 표시용)
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  
  // 라우터
  const router = useRouter();

  // 로그인 상태 및 토큰
  const { isLoggedIn, accessToken: token } = useAuth()

  // 찜한 상품 ID 배열과 상태들만 가져옴
  const {
    favoriteList,   // ex: [1, 5, 8]
    loading,
  } = useFavorite(token);

  // 전체 상품 정보 (상품 id 매칭해서 실제 상품 데이터 보여줌)
  const { products, loading: productsLoading, error: productsError } = useProducts();

  // 카테고리 배열 정의 (메인 페이지와 동일)
  const categories: CategoryName[] = useMemo(() => [
    '전체', '과일', '채소', '쌀_잡곡_견과', '정육_계란류', 
    '수산물_건해산', '우유_유제품', '김치_반찬_델리', '생수_음료_주류', '커피_원두_차',
    '면류_통조림', '양념_오일', '과자_간식', '베이커리_잼', '건강식품'
  ], []);

  // 카테고리 배경색 배열 (메인 페이지와 동일)
  const categoryColors = useMemo(() => [
    '#21ce80', '#4ECDC4', '#edb482', '#fab1a2', '#82E0AA',
    '#f6b0cd', '#a5ed82', '#b2eafa', '#BB8FCE', '#DDA0DD',
    '#96CEB4', '#F7DC6F', '#98D8C8', '#85C1E9', '#87c873'
  ], []);

  // 실제 찜한 상품 정보 리스트 만들기 (ID로 filter)
  const allFavoriteProducts = products.filter(
    (item: Product) => favoriteList.includes(item.id)
  );

  // 카테고리별 필터링된 찜 상품
  const favoriteProducts = useMemo(() => {
    if (selectedCategory === '전체') {
      return allFavoriteProducts;
    }
    
    // 카테고리 매칭 로직 (상품의 category 필드와 비교)
    return allFavoriteProducts.filter((item: Product) => {
      const productCategory = item.category?.replace(/\//g, '_') || '';
      return productCategory === selectedCategory;
    });
  }, [allFavoriteProducts, selectedCategory]);

  // 마우스 드래그 스크롤 핸들러들 (메인 페이지와 동일)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartX(e.pageX - e.currentTarget.offsetLeft);
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - e.currentTarget.offsetLeft;
    const walk = (x - startX) * 1.2; // 스크롤 속도 조절
    e.currentTarget.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // 상품 클릭 핸들러
  const handleProductClick = (productId: number) => {
    if (selectedProduct === productId) {
      // 두 번째 클릭 - 상세 페이지로 이동
      router.push(`/products/${productId}`);
    } else {
      // 첫 번째 클릭 - 말풍선 표시
      setSelectedProduct(productId);
    }
  };

  // 카테고리 변경 시 선택된 상품 초기화
  useEffect(() => {
    setSelectedProduct(null);
  }, [selectedCategory]);

  // 외부 클릭 시 말풍선 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.product-card') && selectedProduct) {
        setSelectedProduct(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedProduct]);

  // 말풍선 컴포넌트
  const ProductTooltip = ({ product }: { product: Product }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const [scrollDistance, setScrollDistance] = useState(0);

    useEffect(() => {
      const checkTextOverflow = () => {
        if (textRef.current && containerRef.current) {
          const textWidth = textRef.current.scrollWidth;
          const containerWidth = containerRef.current.clientWidth;
          
          if (textWidth > containerWidth) {
            setScrollDistance(textWidth - containerWidth + 10); // 여유 공간 추가
            setTimeout(() => {
              setIsScrolling(true);
            }, 1000); // 1초 후 스크롤 시작
          }
        }
      };

      checkTextOverflow();
      window.addEventListener('resize', checkTextOverflow);
      
      return () => {
        window.removeEventListener('resize', checkTextOverflow);
        setIsScrolling(false);
      };
    }, [product.name]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.9 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute -top-20 left-1/2 transform -translate-x-1/2 z-10"
      >
        {/* 말풍선 - GuestTimeOut.tsx 스타일 적용 */}
        <div 
          className="px-4 py-3 rounded-2xl text-sm font-medium whitespace-nowrap min-w-[100px] max-w-[140px]"
          style={{
            background: 'var(--footer-background)',
            border: '1px solid var(--footer-border)',
            backdropFilter: 'blur(10px) saturate(140%)',
            color: 'var(--foreground)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)'
          }}
        >
          {/* 상품명 - 스크롤 가능 */}
          <div 
            ref={containerRef}
            className="overflow-hidden whitespace-nowrap mb-1"
          >
            <motion.div
              ref={textRef}
              animate={{ 
                x: isScrolling ? [-scrollDistance, 0] : 0 
              }}
              transition={{
                duration: isScrolling ? scrollDistance / 30 : 0, // 속도 조절
                repeat: isScrolling ? Infinity : 0,
                repeatType: "reverse",
                repeatDelay: 1,
                ease: "linear"
              }}
              className="text-sm font-semibold text-[var(--foreground)] inline-block"
            >
              {product.name}
            </motion.div>
          </div>
          
          {/* 가격 */}
          {product.discountRate > 0 ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-[11px] text-gray-400 line-through opacity-70">
                {product.price?.toLocaleString?.() || product.price}원
              </span>
              <span className="text-sm text-red-600 font-bold">
                {Math.floor(product.price * (1 - product.discountRate / 100)).toLocaleString()}원
              </span>
            </div>
          ) : (
            <div className="text-sm text-[var(--sobi-green)] font-bold">
              {product.price?.toLocaleString?.() || product.price}원
            </div>
          )}
          
          {/* 브랜드 (있을 경우) */}
          {product.brand && (
            <div className="text-xs opacity-70 mt-1">
              {product.brand}
            </div>
          )}
        </div>
        
        {/* 말풍선 화살표 - 아래쪽 방향 */}
        <div 
          className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `8px solid var(--footer-background)`,
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
          }}
        />
      </motion.div>
    );
  };

  // 1. 로그인 필요
  if (!isLoggedIn || !token) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)' 
      }}>
      <FaExclamationTriangle className="text-red-400 text-5xl mb-3 animate-bounce" />
      <div className="font-bold text-lg text-red-500 mb-2">로그인이 필요합니다!</div>
      <Link
        href="/login"
        className="inline-block px-6 py-2 bg-neutral-900 dark:bg-neutral-800 text-white rounded-full shadow hover:bg-neutral-700 transition-all"
      >
        로그인 하러가기
      </Link>
    </div>
  );

  // 2. 로딩
  if (loading || productsLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)' 
      }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
      <div className="text-lg font-semibold text-[var(--foreground)]">찜 목록을 불러오는 중...</div>
      <div className="text-sm text-gray-400 mt-1">조금만 기다려 주세요!</div>
    </div>
  );

  // 3. 에러 (찜/상품 둘 다 체크)
  if (productsError) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[250px] py-10 text-center"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)' 
      }}>
      <FaExclamationTriangle className="text-red-400 text-5xl mb-3 animate-bounce" />
      <div className="font-bold text-lg text-red-500 mb-2">문제가 발생했어요!</div>
      <div className="text-gray-500 dark:text-gray-300 text-base mb-4">{productsError.message || String(productsError)}</div>
      <button
        className="mt-2 px-6 py-2 bg-red-500 text-white rounded-full shadow hover:bg-red-700 transition-all"
        onClick={() => window.location.reload()}
      >
        새로고침
      </button>
    </div>
  );

  // 4. 전체 찜 목록이 비어있는 경우
  if (!allFavoriteProducts || allFavoriteProducts.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)' 
      }}>
      <Image src="/icon/favorite.png" alt="찜하기 아이콘" width={56} height={56} className="mb-4" style={{ animation: 'slowPulse 3s ease-in-out infinite' }} />
      <div className="font-semibold text-lg text-[var(--foreground)] mb-2">찜한 상품이 없습니다!</div>
      <div className="text-sm text-gray-400 mb-6">
        상품의 상세페이지에서 <Image src="/icon/favorite.png" alt="찜하기" width={24} height={24} className="inline w-4 h-4 mb-1" />를 눌러 찜해보세요
      </div>
      <Link
        href="/products"
        className="inline-block px-6 py-2 bg-[var(--sobi-green)] text-white rounded-full shadow hover:bg-neutral-700 transition-all"
      >
        상품 전체 보기
      </Link>
    </div>
  );

  // 5. 실제 찜목록 렌더링
  return (
    <main
      className="min-h-screen px-4 py-10 pb-24 flex flex-col items-center"
      style={{
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s',
      }}
    >
      <h2 className="text-2xl font-bold mb-6 mt-4" style={{ color: 'var(--foreground)' }}>
        내 찜 목록
      </h2>

      {/* 카테고리 필터 섹션 */}
      <div className="w-full max-w-4xl mb-6">
        <div 
          ref={categoryScrollRef}
          className="flex overflow-x-auto gap-3 pt-2 pb-4 scrollbar-none cursor-grab active:cursor-grabbing"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            overflowY: 'visible', // 세로 방향은 보이도록 설정
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {categories.map((category, index) => {
            const categoryName = category.replace(/_/g, '/');
            const backgroundColor = categoryColors[index];
            const isSelected = selectedCategory === category;
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
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
                    {CATEGORY_ICONS[category]}
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
            );
          })}
        </div>
      </div>

      {/* 선택된 카테고리의 찜 상품 개수 표시 */}
      <div className="w-full max-w-2xl mb-4">
        <div className="text-sm text-[var(--text-secondary)] text-center">
          {selectedCategory === '전체' 
            ? `전체 ${favoriteProducts.length}개의 찜한 상품`
            : `${selectedCategory.replace(/_/g, '/')} 카테고리 ${favoriteProducts.length}개`
          }
        </div>
      </div>

      {/* 카테고리별 필터링 결과가 비어있는 경우 */}
      {favoriteProducts.length === 0 && selectedCategory !== '전체' ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Image src="/icon/favorite.png" alt="찜하기 아이콘" width={48} height={48} className="mb-4 opacity-50" />
          <div className="font-semibold text-lg text-[var(--foreground)] mb-2">
            {selectedCategory.replace(/_/g, '/')} 카테고리에 찜한 상품이 없습니다
          </div>
          <button
            onClick={() => setSelectedCategory('전체')}
            className="text-sm text-[var(--sobi-green)] hover:underline"
          >
            전체 찜 목록 보기
          </button>
        </div>
      ) : (
        /* 찜 상품 그리드 */
        <div className="w-full max-w-4xl px-4">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {favoriteProducts.map((item: Product) => (
              <div
                key={item.id}
                className="relative flex flex-col items-center"
                style={{ minHeight: '100px' }} // 간격 축소
              >
                {/* 말풍선 표시 */}
                <AnimatePresence>
                  {selectedProduct === item.id && (
                    <ProductTooltip product={item} />
                  )}
                </AnimatePresence>

                {/* 상품 카드 */}
                <ShakeWrapper item={item}>
                  <motion.div
                    className="relative cursor-pointer group product-card"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ 
                      scale: selectedProduct === item.id ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleProductClick(item.id)}
                  >
                    {/* 원형 상품 이미지 */}
                    <div className="relative">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={80}
                        height={80}
                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-full shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                        style={{ 
                          backgroundColor: 'var(--input-background)',
                          border: selectedProduct === item.id ? '3px solid var(--sobi-green)' : '2px solid transparent'
                        }}
                        priority
                      />

                      {/* 할인 배지 - 원형 이미지에 맞게 조정 */}
                      {item.discountRate > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-lg z-10">
                          {item.discountRate}%
                        </div>
                      )}

                      {/* 선택된 상태 흐림 효과 */}
                      {selectedProduct === item.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 rounded-full backdrop-blur-sm border-2 border-[var(--sobi-green)]"
                          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                        />
                      )}
                    </div>

                    {/* 호버 시 간단한 정보 표시 (말풍선이 없을 때만) */}
                    {selectedProduct !== item.id && (
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="text-xs text-center text-[var(--text-secondary)] whitespace-nowrap">
                          클릭해서 정보 보기
                        </div>
                      </div>
                    )}
                  </motion.div>
                </ShakeWrapper>
              </div>
            ))}
          </div>

          {/* 클릭 안내 메시지 */}
          <div className="text-center mt-8 text-sm text-[var(--text-secondary)]">
            <div className="mb-1">상품을 <span className="text-[var(--sobi-green)] font-semibold">한 번 클릭</span>하면 정보를 볼 수 있어요</div>
            <div><span className="text-[var(--sobi-green)] font-semibold">두 번 클릭</span>하면 상세 페이지로 이동합니다</div>
          </div>
        </div>
      )}
    </main>
  );
}
