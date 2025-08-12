'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Product } from '@/types';
import { AlertCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api/apiClient';
import { config } from '@/config/env';
import { useBasketData } from '@/store/useBasketStore';

// 상수 정의
const CONSTANTS = {
  CARD: {
    MAX_WIDTH: 300,
    MIN_HEIGHT: 180,
    MIN_HEIGHT_SMALL: 70,
    ASPECT_RATIO: 3 / 4, // 4:3 비율
    WIDTH_DECREASE: 60,
    HEIGHT_DECREASE_RATIO: 2 / 5,
    HEIGHT_DECREASE_SMALL: 15,
    HEIGHT_DECREASE_TINY: 8
  },
  VIEW: {
    HEIGHT: 500,
    SCROLL_THRESHOLD: 0.3,
    SCROLL_SENSITIVITY: 0.1
  },
  PRODUCTS: {
    MAX_COUNT: 30
  }
} as const;

// 커스텀 에러 클래스
class ProductTransformError extends Error {
  constructor(message: string, public productId?: number | string) {
    super(message);
    this.name = 'ProductTransformError';
  }
}

// 상품 데이터 변환 함수
const transformProductData = (rawProduct: unknown): Product => {
  if (!rawProduct || typeof rawProduct !== 'object') {
    throw new ProductTransformError('상품 데이터가 객체가 아닙니다.');
  }
  const product = rawProduct as Record<string, unknown>;

  if (!product.id || !product.name || !product.imageUrl) {
    throw new ProductTransformError(
      `상품 데이터가 불완전합니다: ID=${product.id}, 이름=${product.name}`,
      String(product.id)
    );
  }

  const discountRate = Number(product.discountRate) || 0;
  const price = Number(product.price) || 0;

  if (price <= 0) {
    throw new ProductTransformError(
      `유효하지 않은 가격입니다: ${product.price}`,
      String(product.id)
    );
  }

  const transformedProduct: Product = {
    id: Number(product.id),
    name: String(product.name),
    price,
    stock: Number(product.stock) || 0,
    category: String(product.category || ''),
    imageUrl: String(product.imageUrl),
    discountRate,
    sales: Number(product.sales) || 0,
    tag: String(product.tag || ''),
    location: product.location ? String(product.location) : null,
    description: product.description ? String(product.description) : null,
    brand: product.brand ? String(product.brand) : null,
    discountedPrice: discountRate > 0 
      ? Math.floor(price * (1 - discountRate / 100))
      : price
  };

  if (!transformedProduct) {
    throw new ProductTransformError('변환된 상품 데이터가 유효하지 않습니다.', 'unknown');
  }

  return transformedProduct;
};

interface VerticalCardPagerProps {
  products: readonly Product[];
  selectedProduct: number | null;
  onProductClick: (productId: number) => void;
  onSelectedProductChange: (productId: number | null) => void;
  ProductOverlay: React.FC<{ product: Product }>;
  initialPage?: number;
}

const VerticalCardPager: React.FC<VerticalCardPagerProps> = ({
  products,
  selectedProduct,
  onProductClick,
  onSelectedProductChange,
  ProductOverlay,
  initialPage = 2
}) => {
  const [currentPosition, setCurrentPosition] = useState(initialPage);
  const [scrollOffset, setScrollOffset] = useState(0);


  const getCardWidth = useCallback((index: number) => {
    const cardMaxWidth = CONSTANTS.CARD.MAX_WIDTH;
    const diff = Math.abs(currentPosition - index);
    return Math.max(cardMaxWidth - CONSTANTS.CARD.WIDTH_DECREASE * diff, 0);
  }, [currentPosition]);

  const getCardHeight = useCallback((index: number) => {
    const cardWidth = getCardWidth(index);
    const aspectRatio = CONSTANTS.CARD.ASPECT_RATIO;
    const baseHeight = Math.max(cardWidth * aspectRatio, CONSTANTS.CARD.MIN_HEIGHT);
    const diff = Math.abs(currentPosition - index);

    if (diff >= 0 && diff < 1) {
      return baseHeight - baseHeight * CONSTANTS.CARD.HEIGHT_DECREASE_RATIO * (diff - Math.floor(diff));
    } else if (diff >= 1 && diff < 2) {
      return baseHeight - baseHeight * CONSTANTS.CARD.HEIGHT_DECREASE_RATIO - CONSTANTS.CARD.HEIGHT_DECREASE_SMALL * (diff - Math.floor(diff));
    } else {
      const height = baseHeight - baseHeight * CONSTANTS.CARD.HEIGHT_DECREASE_RATIO - CONSTANTS.CARD.HEIGHT_DECREASE_SMALL - CONSTANTS.CARD.HEIGHT_DECREASE_TINY * (diff - Math.floor(diff));
      return Math.max(height, CONSTANTS.CARD.MIN_HEIGHT_SMALL);
    }
  }, [currentPosition, getCardWidth]);

  const getCardTop = useCallback((index: number) => {
    const viewHeight = CONSTANTS.VIEW.HEIGHT;
    const cardHeight = getCardHeight(index);
    const diff = currentPosition - index + scrollOffset;
    const diffAbs = Math.abs(diff);
    const basePosition = (viewHeight / 2) - (cardHeight / 2);
    const cardMaxHeight = Math.max(getCardWidth(0) * (3 / 4), 200);

    if (diffAbs === 0) return basePosition;
    if (diffAbs > 0 && diffAbs <= 1) {
      return diff >= 0
        ? basePosition - (cardMaxHeight * (4 / 7)) * diffAbs
        : basePosition + (cardMaxHeight * (4 / 7)) * diffAbs;
    } else if (diffAbs > 1 && diffAbs < 2) {
      return diff >= 0
        ? basePosition - (cardMaxHeight * (4 / 7)) - cardMaxHeight * (1 / 7) * Math.abs(diffAbs - Math.floor(diffAbs))
        : basePosition + (cardMaxHeight * (4 / 7)) + cardMaxHeight * (1 / 7) * Math.abs(diffAbs - Math.floor(diffAbs));
    } else {
      return diff >= 0
        ? basePosition - cardMaxHeight * (5 / 7)
        : basePosition + cardMaxHeight * (5 / 7);
    }
  }, [currentPosition, getCardHeight, scrollOffset, getCardWidth]);

  const getOpacity = useCallback((index: number) => {
    const diff = currentPosition - index + scrollOffset;
    if (diff >= -2 && diff <= 2) return 1.0;
    if (diff > -3 && diff < -2) return 3 - Math.abs(diff);
    if (diff > 2 && diff < 3) return 3 - Math.abs(diff);
    return 0;
  }, [currentPosition, scrollOffset]);

  const handleCardClick = useCallback((index: number) => {
    if (Math.abs(currentPosition - Math.floor(currentPosition)) <= 0.15) {
      const product = products[index];
      if (product && product.id) {
        onProductClick(product.id);
      }
    }
  }, [currentPosition, products, onProductClick]);



  const wheelRef = useRef<HTMLDivElement>(null);

  // 터치 이벤트 처리
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
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
      const newPosition = Math.min(products.length - 1, Math.floor(currentPosition) + 1);
      setCurrentPosition(newPosition);
      setScrollOffset(0);
      // 스크롤 시 선택된 상품 초기화
      if (selectedProduct) {
        onSelectedProductChange(null);
      }
    } else if (isDownSwipe) {
      const newPosition = Math.max(0, Math.floor(currentPosition) - 1);
      setCurrentPosition(newPosition);
      setScrollOffset(0);
      // 스크롤 시 선택된 상품 초기화
      if (selectedProduct) {
        onSelectedProductChange(null);
      }
    }
  }, [touchStart, touchEnd, currentPosition, products.length, minSwipeDistance, selectedProduct, onSelectedProductChange]);

  // 휠 이벤트 리스너 설정
  useEffect(() => {
    const element = wheelRef.current;
    if (!element) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const sensitivity = CONSTANTS.VIEW.SCROLL_SENSITIVITY;
      const delta = e.deltaY * sensitivity;
      const newOffset = scrollOffset + delta;
      const threshold = CONSTANTS.VIEW.SCROLL_THRESHOLD;

      if (newOffset > threshold) {
        const newPosition = Math.min(products.length - 1, Math.floor(currentPosition) + 1);
        setCurrentPosition(newPosition);
        setScrollOffset(0);
        // 스크롤 시 선택된 상품 초기화
        if (selectedProduct) {
          onSelectedProductChange(null);
        }
      } else if (newOffset < -threshold) {
        const newPosition = Math.max(0, Math.floor(currentPosition) - 1);
        setCurrentPosition(newPosition);
        setScrollOffset(0);
        // 스크롤 시 선택된 상품 초기화
        if (selectedProduct) {
          onSelectedProductChange(null);
        }
      } else {
        setScrollOffset(newOffset);
      }
    };

    element.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => element.removeEventListener('wheel', handleWheelEvent);
  }, [currentPosition, products.length, scrollOffset, selectedProduct, onSelectedProductChange]);

  return (
    <div
      ref={wheelRef}
      className="relative w-full h-[500px] overflow-hidden"
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
          if (opacity <= 0) return null;

          return (
            <div
              key={product.id}
              className="absolute left-1/2 transform -translate-x-1/2 cursor-pointer product-card"
              style={{
                top: cardTop,
                width: cardWidth,
                height: cardHeight,
                zIndex: 10 - Math.abs(currentPosition - index),
              }}
            >
              <motion.div
                className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg border-1 border-gray-200"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity,
                  scale: selectedProduct === product.id 
                    ? (Math.abs(currentPosition - index + scrollOffset) <= 0.5 ? 1.1 : 1.0)
                    : (Math.abs(currentPosition - index + scrollOffset) <= 0.5 ? 1 : 0.9),
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                onClick={() => handleCardClick(index)}
                whileHover={{
                  scale: Math.abs(currentPosition - index + scrollOffset) <= 0.5 ? 1.05 : 0.95,
                  transition: { duration: 0.2 },
                }}
              >
                <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />

                {/* 상품 정보 오버레이 표시 */}
                <AnimatePresence>
                  {selectedProduct === product.id && (
                    <ProductOverlay product={product} />
                  )}
                </AnimatePresence>


              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default function AIPage() {
  const router = useRouter();
  const basketData = useBasketData();
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);



  // 장바구니 추천 상품 우선 사용
  const basketRecommendations = useMemo(() => {
    if (!basketData || !basketData.recommendations) return [];
    return basketData.recommendations.filter(rec => rec && rec.id);
  }, [basketData]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (basketRecommendations.length > 0) {
        const aiProducts = basketRecommendations.slice(0, CONSTANTS.PRODUCTS.MAX_COUNT);
        setProducts(aiProducts);
        setLoading(false);
        return;
      }

      const response = await apiRequest(config.API_ENDPOINTS.PRODUCTS, { method: 'GET' }, true);
      if (response.ok) {
        const data = await response.json();
        const productsData = data.data || [];
        const aiProducts: Product[] = productsData
          .slice(0, CONSTANTS.PRODUCTS.MAX_COUNT)
          .map((rawProduct: unknown, index: number) => {
            try {
              return transformProductData(rawProduct);
            } catch (error) {
              console.warn(`상품 ${index} 변환 실패:`, error);
              return null;
            }
          })
          .filter((p: Product | null): p is Product => p !== null);

        setProducts(aiProducts);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: 상품 데이터를 불러오는데 실패했습니다.`;
        throw new Error(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [basketRecommendations]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (basketRecommendations.length > 0) {
      const aiProducts = basketRecommendations.slice(0, CONSTANTS.PRODUCTS.MAX_COUNT);
      setProducts(aiProducts);
      setError(null);
      setLoading(false);
    }
  }, [basketRecommendations]);

  useEffect(() => {
    if (products.length > 0 && !selectedProduct) {
      // 초기에는 선택된 상품을 설정하지 않음
      // setSelectedProduct(products[initialIndex].id);
    }
  }, [products, selectedProduct]);

  // 상품 클릭 핸들러
  const handleProductClick = useCallback((productId: number) => {
    if (selectedProduct === productId) {
      // 두 번째 클릭 - 상세 페이지로 이동
      router.push(`/products/${productId}`);
    } else {
      // 첫 번째 클릭 - 말풍선 표시
      setSelectedProduct(productId);
    }
  }, [selectedProduct, router]);

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



  // 상품 정보 오버레이 컴포넌트
  const ProductOverlay = ({ product }: { product: Product }) => {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="absolute inset-0 backdrop-blur-sm flex items-center justify-center p-8 rounded-2xl"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
        }}
      >
        {/* 상품명과 가격 표시 */}
        <div className="text-center max-w-sm">
          <h2 
            className="text-2xl font-bold leading-relaxed mb-4"
            style={{ 
              color: 'white',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              lineHeight: '1.6',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word'
            }}
          >
            {product.name}
          </h2>
          
          {/* 가격 정보 */}
          <div className="flex flex-col items-center gap-2">
            {product.discountRate > 0 ? (
              <>
                {/* 할인가 */}
                <div className="text-3xl font-bold" style={{ color: '#ef4444' }}>
                  {Math.floor(product.price * (1 - product.discountRate / 100)).toLocaleString()}원
                </div>
                {/* 할인율 */}
                <div className="text-lg font-semibold" style={{ color: '#ef4444' }}>
                  {product.discountRate}% 할인
                </div>
              </>
            ) : (
              /* 정상가 */
              <div className="text-3xl font-bold" style={{ color: 'white' }}>
                {product.price?.toLocaleString?.() || product.price}원
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };



  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
        style={{ color: 'var(--foreground)' }}
      >
        {/* AI 특별 배경 - 로딩 상태 */}
        <div className="absolute inset-0 -z-10">
          <div 
            className="absolute inset-0 opacity-90"
            style={{
              background: `
                radial-gradient(circle at 20% 80%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.4) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(5, 150, 105, 0.2) 0%, transparent 50%),
                linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 50%, rgba(5, 150, 105, 0.1) 100%)
              `,
            }}
          />
        </div>
        
        <div className="relative z-10">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
          <h2 className="text-lg font-semibold mb-2">AI 추천 상품을 분석 중...</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>잠시만 기다려주세요.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
        style={{ color: 'var(--foreground)' }}
      >
        {/* AI 특별 배경 - 에러 상태 */}
        <div className="absolute inset-0 -z-10">
          <div 
            className="absolute inset-0 opacity-90"
            style={{
              background: `
                radial-gradient(circle at 20% 80%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.4) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(5, 150, 105, 0.2) 0%, transparent 50%),
                linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 50%, rgba(5, 150, 105, 0.1) 100%)
              `,
            }}
          />
        </div>
        
        <div className="relative z-10">
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
              onClick={() => window.location.reload()}
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
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-4 flex flex-col items-center relative overflow-hidden"
      style={{ 
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s',
      }}
    >
      {/* AI 특별 배경 - 울렁거리는 움직이는 그라데이션 */}
      <div className="absolute inset-0 -z-10">
        {/* 메인 그라데이션 배경 */}
        <div 
          className="absolute inset-0 opacity-90"
          style={{
            background: `
              radial-gradient(circle at 20% 80%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.4) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(5, 150, 105, 0.2) 0%, transparent 50%),
              linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 50%, rgba(5, 150, 105, 0.1) 100%)
            `,
          }}
        />
        
        {/* 움직이는 그라데이션 오브젝트들 */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.5) 0%, transparent 70%)',
          }}
          animate={{
            x: [0, 150, -100, 50, -80, 0],
            y: [0, -120, 80, -60, 100, 0],
            scale: [1, 1.4, 0.6, 1.2, 0.8, 1],
            rotate: [0, 180, 360, 180, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.div
          className="absolute top-3/4 right-1/4 w-80 h-80 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%)',
          }}
          animate={{
            x: [0, -180, 120, -60, 90, 0],
            y: [0, 150, -90, 70, -120, 0],
            scale: [1, 0.5, 1.5, 0.8, 1.3, 1],
            rotate: [0, -180, 360, -90, 180, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        
        <motion.div
          className="absolute top-1/2 left-1/2 w-72 h-72 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(5, 150, 105, 0.35) 0%, transparent 70%)',
          }}
          animate={{
            x: [0, 100, -150, 80, -120, 0],
            y: [0, -180, 60, -100, 80, 0],
            scale: [1, 1.3, 0.7, 1.1, 0.9, 1],
            rotate: [0, 90, 270, 180, 360, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
        />
        
        {/* 추가 움직이는 오브젝트들 */}
        <motion.div
          className="absolute top-1/6 right-1/6 w-64 h-64 rounded-full opacity-18"
          style={{
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
          }}
          animate={{
            x: [0, 80, -120, 60, -90, 0],
            y: [0, -100, 70, -80, 120, 0],
            scale: [1, 1.2, 0.6, 1.4, 0.8, 1],
            rotate: [0, 270, 90, 180, 360, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        
        <motion.div
          className="absolute bottom-1/6 left-1/6 w-56 h-56 rounded-full opacity-12"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
          }}
          animate={{
            x: [0, -140, 90, -70, 110, 0],
            y: [0, 80, -120, 60, -90, 0],
            scale: [1, 0.8, 1.3, 0.7, 1.1, 1],
            rotate: [0, 180, 360, 90, 270, 0],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        />
        
        {/* 작은 움직이는 점들 */}
        <motion.div
          className="absolute top-1/3 right-1/3 w-4 h-4 rounded-full opacity-40"
          style={{
            background: 'rgba(34, 197, 94, 0.7)',
          }}
          animate={{
            x: [0, 80, -50, 30, -70, 0],
            y: [0, -60, 40, -30, 50, 0],
            scale: [1, 2, 0.3, 1.8, 0.5, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.div
          className="absolute bottom-1/3 left-1/3 w-3 h-3 rounded-full opacity-35"
          style={{
            background: 'rgba(16, 185, 129, 0.6)',
          }}
          animate={{
            x: [0, -90, 60, -40, 70, 0],
            y: [0, 50, -80, 40, -60, 0],
            scale: [1, 0.2, 2.5, 0.4, 1.6, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        
        <motion.div
          className="absolute top-2/3 left-2/3 w-5 h-5 rounded-full opacity-30"
          style={{
            background: 'rgba(5, 150, 105, 0.5)',
          }}
          animate={{
            x: [0, 70, -40, 50, -60, 0],
            y: [0, -50, 30, -40, 60, 0],
            scale: [1, 1.7, 0.4, 1.9, 0.6, 1],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        
        {/* 파도 효과 - 더 역동적으로 */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-40 opacity-25"
          style={{
            background: `
              linear-gradient(45deg, 
                transparent 20%, 
                rgba(34, 197, 94, 0.15) 40%, 
                rgba(16, 185, 129, 0.1) 60%, 
                transparent 80%
              )
            `,
          }}
          animate={{
            x: [0, 200, -150, 100, 0],
            scaleX: [1, 1.2, 0.8, 1.1, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-32 opacity-20"
          style={{
            background: `
              linear-gradient(-45deg, 
                transparent 25%, 
                rgba(16, 185, 129, 0.12) 45%, 
                rgba(5, 150, 105, 0.08) 65%, 
                transparent 85%
              )
            `,
          }}
          animate={{
            x: [0, -150, 120, -80, 0],
            scaleX: [1, 0.9, 1.3, 0.7, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        />
        
        {/* 추가 파도 효과 */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-24 opacity-15"
          style={{
            background: `
              linear-gradient(90deg, 
                transparent 30%, 
                rgba(34, 197, 94, 0.08) 50%, 
                transparent 70%
              )
            `,
          }}
          animate={{
            x: [0, 100, -80, 60, 0],
            scaleY: [1, 1.5, 0.6, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </div>
      
      <div className="w-full max-w-4xl pt-16 relative z-10">

        {/* 수직 카드 페이저 */}
        {products.length > 0 ? (
          <VerticalCardPager
            products={products}
            selectedProduct={selectedProduct}
            onProductClick={handleProductClick}
            onSelectedProductChange={setSelectedProduct}
            ProductOverlay={ProductOverlay}
            initialPage={2}
          />
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


      </div>
    </main>
  );
}
