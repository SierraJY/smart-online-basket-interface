'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/utils/hooks/useAuth';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/utils/api/apiClient';
import { config } from '@/config/env';

// 상품 타입 정의
interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string;
  discountRate: number;
  sales: number;
  tag: string;
  location: string;
  description: string;
  brand: string;
  discountedPrice?: number;
}

// 수직 카드 페이저 컴포넌트
interface VerticalCardPagerProps {
  products: Product[];
  onPageChanged?: (page: number) => void;
  onSelectedItem?: (index: number) => void;
  initialPage?: number;
}

const VerticalCardPager: React.FC<VerticalCardPagerProps> = ({
  products,
  onPageChanged,
  onSelectedItem,
  initialPage = 2
}) => {
  const [currentPosition, setCurrentPosition] = useState(initialPage);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0); // 스크롤 오프셋 추가

  const handlePageChange = useCallback((newPosition: number) => {
    setCurrentPosition(newPosition);
    onPageChanged?.(newPosition);
  }, [onPageChanged]);

  const handleItemSelect = useCallback((index: number) => {
    onSelectedItem?.(index);
  }, [onSelectedItem]);

  // 카드 너비 계산
  const getCardWidth = useCallback((index: number) => {
    const cardMaxWidth = 300;
    const diff = Math.abs(currentPosition - index);
    return Math.max(cardMaxWidth - 60 * diff, 0);
  }, [currentPosition]);

  // 카드 높이 계산 (4:3 비율 적용, 최소 높이 보장)
  const getCardHeight = useCallback((index: number) => {
    const cardWidth = getCardWidth(index);
    const aspectRatio = 3 / 4; // 4:3 비율 (가로:세로 = 4:3, 세로:가로 = 3:4)
    const baseHeight = Math.max(cardWidth * aspectRatio, 180); // 최소 높이 180px로 조정
    const diff = Math.abs(currentPosition - index);
    
    if (diff >= 0 && diff < 1) {
      return baseHeight - baseHeight * (2 / 5) * (diff - Math.floor(diff)); // 높이 감소율 더 줄임
    } else if (diff >= 1 && diff < 2) {
      return baseHeight - baseHeight * (2 / 5) - 15 * (diff - Math.floor(diff)); // 최소 높이 보장
    } else {
      const height = baseHeight - baseHeight * (2 / 5) - 15 - 8 * (diff - Math.floor(diff));
      return Math.max(height, 70); // 최소 70px 보장
    }
  }, [currentPosition, getCardWidth]);



  // 카드 위치 계산 (스크롤 오프셋 반영)
  const getCardTop = useCallback((index: number) => {
    const viewHeight = 500; // 500px로 변경
    const cardHeight = getCardHeight(index);
    const diff = currentPosition - index + scrollOffset; // 스크롤 오프셋 추가
    const diffAbs = Math.abs(diff);
    const basePosition = (viewHeight / 2) - (cardHeight / 2);
    const cardMaxHeight = Math.max(getCardWidth(0) * (3 / 4), 200); // 4:3 비율 기준 최대 높이, 최소 200px

    if (diffAbs === 0) {
      return basePosition;
    }
    if (diffAbs > 0 && diffAbs <= 1) {
      if (diff >= 0) {
        return basePosition - (cardMaxHeight * (4 / 7)) * diffAbs; // 간격을 더 좁게 조정
      } else {
        return basePosition + (cardMaxHeight * (4 / 7)) * diffAbs;
      }
    } else if (diffAbs > 1 && diffAbs < 2) {
      if (diff >= 0) {
        return basePosition - (cardMaxHeight * (4 / 7)) - cardMaxHeight * (1 / 7) * Math.abs(diffAbs - Math.floor(diffAbs));
      } else {
        return basePosition + (cardMaxHeight * (4 / 7)) + cardMaxHeight * (1 / 7) * Math.abs(diffAbs - Math.floor(diffAbs));
      }
    } else {
      if (diff >= 0) {
        return basePosition - cardMaxHeight * (5 / 7);
      } else {
        return basePosition + cardMaxHeight * (5 / 7);
      }
    }
  }, [currentPosition, getCardHeight, scrollOffset]);

  // 투명도 계산 (스크롤 오프셋 반영)
  const getOpacity = useCallback((index: number) => {
    const diff = currentPosition - index + scrollOffset; // 스크롤 오프셋 추가
    
    if (diff >= -2 && diff <= 2) {
      return 1.0;
    } else if (diff > -3 && diff < -2) {
      return 3 - Math.abs(diff);
    } else if (diff > 2 && diff < 3) {
      return 3 - Math.abs(diff);
    } else {
      return 0;
    }
  }, [currentPosition, scrollOffset]);

  // 폰트 크기 계산 (스크롤 오프셋 반영)
  const getFontSize = useCallback((index: number) => {
    const diffAbs = Math.abs(currentPosition - index + scrollOffset); // 스크롤 오프셋 추가
    const maxFontSize = 50;
    
    if (diffAbs >= 0 && diffAbs < 1) {
      if (diffAbs < 0.02) {
        return maxFontSize;
      }
      return maxFontSize - 25 * (diffAbs - Math.floor(diffAbs));
    } else if (diffAbs >= 1 && diffAbs < 2) {
      return maxFontSize - 25 - 5 * (diffAbs - Math.floor(diffAbs));
    } else {
      const fontSize = maxFontSize - 30 - 15 * (diffAbs - Math.floor(diffAbs));
      return fontSize > 0 ? fontSize : 0;
    }
  }, [currentPosition, scrollOffset]);

  // 터치/클릭 이벤트 처리
  const handleCardClick = useCallback((index: number) => {
    if (Math.abs(currentPosition - Math.floor(currentPosition)) <= 0.15) {
      if (Math.floor(currentPosition) === index) {
        handleItemSelect(index);
      } else {
        const goToPage = Math.floor(currentPosition) + index - 2;
        if (goToPage >= 0 && goToPage < products.length) {
          setCurrentPosition(goToPage);
          setScrollOffset(0);
          onPageChanged?.(goToPage);
        }
      }
    }
  }, [currentPosition, products.length, onPageChanged, handleItemSelect]);



  // 터치 이벤트 처리
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 최소 스와이프 거리 (픽셀)
  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;
    const isDownSwipe = distance < -minSwipeDistance;

    if (isUpSwipe) {
      // 다음 상품으로 이동
      const newPosition = Math.min(products.length - 1, Math.floor(currentPosition) + 1);
      setCurrentPosition(newPosition);
      setScrollOffset(0);
      onPageChanged?.(newPosition);
    } else if (isDownSwipe) {
      // 이전 상품으로 이동
      const newPosition = Math.max(0, Math.floor(currentPosition) - 1);
      setCurrentPosition(newPosition);
      setScrollOffset(0);
      onPageChanged?.(newPosition);
    }
  }, [touchStart, touchEnd, currentPosition, products.length, onPageChanged]);

  // 휠 이벤트를 위한 ref
  const wheelRef = useRef<HTMLDivElement>(null);

  // 휠 이벤트 리스너 설정
  useEffect(() => {
    const element = wheelRef.current;
    if (!element) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      
      // 스크롤 감도 조절 (더 부드러운 움직임)
      const sensitivity = 0.1;
      const delta = e.deltaY * sensitivity;
      
      // 새로운 오프셋 계산
      const newOffset = scrollOffset + delta;
      
      // 임계값 설정 (0.3 = 30% 스크롤 시 다음/이전 상품으로 이동)
      const threshold = 0.3;
      
      if (newOffset > threshold) {
        // 다음 상품으로 이동
        const newPosition = Math.min(products.length - 1, Math.floor(currentPosition) + 1);
        setCurrentPosition(newPosition);
        setScrollOffset(0);
        onPageChanged?.(newPosition);
      } else if (newOffset < -threshold) {
        // 이전 상품으로 이동
        const newPosition = Math.max(0, Math.floor(currentPosition) - 1);
        setCurrentPosition(newPosition);
        setScrollOffset(0);
        onPageChanged?.(newPosition);
      } else {
        // 오프셋만 업데이트 (부드러운 움직임)
        setScrollOffset(newOffset);
      }
    };

    // non-passive 이벤트 리스너로 설정
    element.addEventListener('wheel', handleWheelEvent, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheelEvent);
    };
  }, [currentPosition, products.length, onPageChanged, scrollOffset]);

  return (
    <div 
      ref={wheelRef}
      className="relative w-full h-[500px] overflow-hidden"
      style={{
        backgroundColor: 'var(--background)',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <AnimatePresence>
        {products.map((product, index) => {
          const cardWidth = getCardWidth(index);
          const cardHeight = getCardHeight(index);
          const cardTop = getCardTop(index);
          const opacity = getOpacity(index);
          const fontSize = getFontSize(index);

          if (opacity <= 0) return null;

          return (
            <motion.div
              key={product.id}
              className="absolute left-1/2 transform -translate-x-1/2 cursor-pointer"
              style={{
                top: cardTop,
                width: cardWidth,
                height: cardHeight,
                zIndex: 10 - Math.abs(currentPosition - index),
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: opacity,
                scale: Math.abs(currentPosition - index + scrollOffset) <= 0.5 ? 1 : 0.9,
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={() => handleCardClick(index)}
              whileHover={{ 
                scale: Math.abs(currentPosition - index + scrollOffset) <= 0.5 ? 1.05 : 0.95,
                transition: { duration: 0.2 }
              }}
            >
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg border-1 border-gray-200">
                {/* 상품 이미지 */}
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                
                {/* 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                
                  {/* 상품 정보 */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {/* <h3 
                      className="text-white font-bold text-center mb-2"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {product.name}
                    </h3> */}
                    
                    {/* 가격 정보 */}
                    <div className="flex items-center justify-center space-x-2">
                      {product.discountRate > 0 ? (
                        <>
                          <span className="text-sm text-gray-300 line-through">
                            {product.price.toLocaleString()}원
                          </span>
                          <span className="text-lg font-bold text-red-400">
                            {product.discountedPrice?.toLocaleString()}원
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-white">
                          {product.price.toLocaleString()}원
                        </span>
                      )}
                    </div>
                    
                    {/* 할인 배지 */}
                    {product.discountRate > 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {product.discountRate}%
                      </div>
                    )}
                    
                    {/* 브랜드 배지 */}
                    {product.brand && product.brand !== 'NULL::character varying' && (
                      <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-full">
                        {product.brand}
                      </div>
                    )}
                  </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {/* 페이지 인디케이터 */}
      {/* <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {products.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              Math.abs(currentPosition - index + scrollOffset) <= 0.5 
                ? 'bg-white scale-125' 
                : 'bg-white/50 scale-100'
            }`}
          />
        ))}
      </div> */}
    </div>
  );
};

export default function AIPage() {
  const router = useRouter();
  const { accessToken: token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // 상품 데이터 가져오기
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(config.API_ENDPOINTS.PRODUCTS, true);
      
      if (response.ok) {
        const data = await response.json();
        
        // 응답 데이터 구조 확인 및 변환
        const productsData = data.products || data || [];
        const aiProducts: Product[] = productsData.slice(0, 30).map((product: any) => ({
          ...product,
          discountedPrice: product.discountRate > 0 
            ? Math.floor(product.price * (1 - product.discountRate / 100))
            : product.price
        }));
        
        setProducts(aiProducts);
        console.log(`AI 페이지: ${aiProducts.length}개 상품 로드 완료`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || '상품 데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('AI 페이지 상품 데이터 로딩 오류:', err);
      setError(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로딩
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 초기 선택된 상품 설정
  useEffect(() => {
    if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[2]); // 초기 페이지(2)에 해당하는 상품
    }
  }, [products, selectedProduct]);

  // 페이지 변경 핸들러
  const handlePageChanged = useCallback((page: number) => {
    console.log('AI 페이지 현재 위치:', page);
    // 현재 위치에 해당하는 상품을 선택된 상품으로 설정
    const currentProduct = products[Math.floor(page)];
    if (currentProduct) {
      setSelectedProduct(currentProduct);
    }
  }, [products]);

  // 아이템 선택 핸들러
  const handleItemSelected = useCallback((index: number) => {
    const product = products[index];
    if (product) {
      router.push(`/products/${product.id}`);
    }
  }, [products, router]);

  // 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 로딩 상태
  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
      >
        <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-semibold mb-2">AI 추천 상품을 분석 중...</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>잠시만 기다려주세요.</p>
      </main>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
      >
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold mb-2">오류가 발생했습니다</h2>
        <p className="text-red-500 text-sm mb-6 text-center">{error}</p>
        <div className="flex space-x-4">
          <button 
            className="py-3 px-6 rounded-lg shadow-sm hover:opacity-80 transition-all"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
              color: 'var(--foreground)',
            }}
            onClick={handleRefresh}
          >
            다시 시도
          </button>
          <button 
            className="py-3 px-6 rounded-lg shadow-sm hover:opacity-80 transition-all"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
              color: 'var(--foreground)',
            }}
            onClick={() => router.push('/')}
          >
            홈으로
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-8 pb-24 flex flex-col items-center"
      style={{ 
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s',
        backgroundColor: 'var(--background)'
      }}
    >
      <div className="pt-10 w-full max-w-4xl">
        {/* 헤더 */}
        {/* <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <h1 className="text-2xl font-bold">AI 추천 상품</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            AI가 분석한 맞춤형 상품 추천을 확인해보세요
          </p>
        </div> */}

        {/* 새로고침 버튼 */}
        <div className="text-center mb-6">
          <button 
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 py-2 px-4 text-sm rounded-lg hover:opacity-80 transition-all"
            style={{
              border: '1px solid var(--sobi-green-border)',
              backgroundColor: 'var(--sobi-green-light)',
              color: 'var(--sobi-green)',
            }}
          >
            추천 새로고침
          </button>
        </div>

        {/* 수직 카드 페이저 */}

          {products.length > 0 ? (
            <>
              <VerticalCardPager
                products={products}
                onPageChanged={handlePageChanged}
                onSelectedItem={handleItemSelected}
                initialPage={2}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                추천할 상품이 없습니다.
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                장바구니에 상품을 담아보세요!
              </p>
            </div>
          )}


        {/* 선택된 상품 상세 정보 */}
        {selectedProduct && (
          <div className="p-6 rounded-lg shadow-sm"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
            }}
          >         
            <div className="space-y-4">
              {/* 상품명 */}
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">
                  {selectedProduct.name}
                </h3>
              </div>

              {/* 태그 영역 */}
              {selectedProduct.tag && selectedProduct.tag !== 'NULL::character varying' && (
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.tag.split(' ').filter(tag => tag.startsWith('#')).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: 'linear-gradient(135deg, var(--sobi-green) 0%, rgba(66, 184, 131, 0.8) 100%)',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(66, 184, 131, 0.3)'
                      }}
                    >
                      {tag.replace('#', '# ')}
                    </span>
                  ))}
                </div>
              )}

              {/* 가격 및 브랜드 */}
              <div>
                {selectedProduct.discountRate && selectedProduct.discountRate > 0 ? (
                  <div className="mb-2">
                    {/* 원가 (취소선) */}
                    <p className="text-lg text-[var(--text-secondary)] line-through mb-1">
                      {selectedProduct.price.toLocaleString()}원
                    </p>
                    {/* 할인가 */}
                    <p className="text-2xl font-bold text-[var(--foreground)] mb-1">
                      {selectedProduct.discountedPrice?.toLocaleString()}원
                    </p>
                    {/* 할인율 */}
                    <span 
                      className="inline-block px-2 py-1 rounded-md text-sm font-semibold text-white"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      {selectedProduct.discountRate}%
                    </span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-[var(--foreground)] mb-1">
                    {selectedProduct.price.toLocaleString()}원
                  </p>
                )}
                {selectedProduct.brand && selectedProduct.brand !== 'NULL::character varying' && (
                  <p className="text-lg font-semibold text-[var(--foreground)] mb-2">
                    {selectedProduct.brand}
                  </p>
                )}
              </div>

              {/* 카테고리 및 재고 */}
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  남은 재고: <span className="font-semibold text-[var(--foreground)]">{selectedProduct.stock}</span>
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--sobi-green)' }}>
                  {selectedProduct.category.replace(/_/g, '/')}
                </p>
              </div>

              {/* 상품 설명 */}
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">상품 설명</h3>
                {selectedProduct.description && selectedProduct.description !== '(NULL)' ? (
                  <p className="text-base leading-relaxed text-[var(--text-secondary)]">
                    {selectedProduct.description}
                  </p>
                ) : (
                  <span 
                    className="block w-full py-3 px-4 font-semibold transition-all duration-200 text-center text-2xl"
                  >
                    상세설명 준비 중
                    <span className="inline-block ml-1">
                      <span className="animate-dots">.</span>
                      <span className="animate-dots" style={{ animationDelay: '0.2s' }}>.</span>
                      <span className="animate-dots" style={{ animationDelay: '0.4s' }}>.</span>
                      <span className="animate-dots" style={{ animationDelay: '0.6s' }}>.</span>
                      <span className="animate-dots" style={{ animationDelay: '0.8s' }}>.</span>
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
