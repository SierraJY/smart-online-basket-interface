// 장바구니 페이지

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useBasketId, useActivatedBasketId, useBasketData, useBasketStore, useBasketItems } from '@/store/useBasketStore';
import { useAuth } from '@/utils/hooks/useAuth';
import { useActivateBasket } from '@/utils/hooks/useActivateBasket';
import { reconnectGlobalSSE } from '@/utils/hooks/useGlobalBasketSSE';
import { Package, ShoppingBasket, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// 물고기처럼 떠다니는 상품 아이콘 컴포넌트
const FloatingProductFish = ({ item, index }: { item: any; index: number }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // 랜덤한 시작 위치와 방향 (더 자연스러운 분포)
  const startX = 20 + Math.random() * 60; // 20-80% 범위
  const startY = 20 + Math.random() * 60; // 20-80% 범위
  const duration = 20 + Math.random() * 15; // 20-35초
  const delay = index * 0.8; // 각 아이템마다 0.8초씩 지연
  
  // 물고기 꼬리 움직임을 위한 추가 애니메이션
  const tailWiggle = {
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "easeInOut" as const,
    }
  };
  
  return (
    <motion.div
      className="absolute"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        zIndex: 10,
      }}
      animate={{
        x: [
          Math.random() * 120 - 60,
          Math.random() * 120 - 60,
          Math.random() * 120 - 60,
          Math.random() * 120 - 60,
          Math.random() * 120 - 60,
        ],
        y: [
          Math.random() * 120 - 60,
          Math.random() * 120 - 60,
          Math.random() * 120 - 60,
          Math.random() * 120 - 60,
          Math.random() * 120 - 60,
        ],
        rotate: [0, 90, 180, 270, 360],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
        delay: delay,
        times: [0, 0.25, 0.5, 0.75, 1],
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ 
        scale: 1.3,
        rotate: 0,
        transition: { duration: 0.3 }
      }}
      whileTap={{ 
        scale: 0.9,
        transition: { duration: 0.1 }
      }}
    >
      <Link href={`/products/${item.product.id}`}>
        <motion.div
          className="relative cursor-pointer"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="relative">
            <Image
              src={item.product.imageUrl}
              alt={item.product.name}
              width={80}
              height={80}
              className="w-20 h-20 object-cover rounded-full shadow-lg border-4 border-white dark:border-gray-800"
              style={{
                filter: isHovered ? 'brightness(1.2)' : 'brightness(1)',
              }}
            />
            
            {/* 물고기 꼬리 효과 */}
            <motion.div
              className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-8"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                borderRadius: '50%',
              }}
              animate={tailWiggle}
            />
          </div>
          
          {/* 수량 표시 */}
          <motion.div
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {item.quantity}
          </motion.div>
          
          {/* 호버 시 상품명 표시 */}
          {isHovered && (
            <motion.div
              className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-black bg-opacity-75 text-white text-sm rounded-lg whitespace-nowrap z-20"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {item.product.name}
            </motion.div>
          )}
        </motion.div>
      </Link>
    </motion.div>
  );
};

// 물고기 애니메이션 배경 컴포넌트
const FishTankBackground = ({ items }: { items: any[] }) => {
  return (
    <div className="relative w-full h-96 rounded-2xl overflow-hidden mb-8"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: '2px solid var(--sobi-green-border)',
      }}
    >
      {/* 물속 해초 효과 */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`seaweed-${i}`}
          className="absolute bottom-0 w-1 bg-green-400 bg-opacity-60"
          style={{
            left: `${10 + i * 12}%`,
            height: '60px',
          }}
          animate={{
            rotate: [0, 2, -2, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}
      {/* 물속 거품 효과 */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white bg-opacity-30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: '-10px',
          }}
          animate={{
            y: [0, -400],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeOut",
          }}
        />
      ))}
      
      {/* 물고기들 */}
      {items.map((item: any, index: number) => (
        <FloatingProductFish key={item.product.id} item={item} index={index} />
      ))}
      
      {/* 물속 조명 효과 */}
      <motion.div
        className="absolute top-0 left-0 w-full h-full"
        style={{
          background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        }}
        animate={{
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

export default function BasketsPage() {
  const router = useRouter();
  const { accessToken: token } = useAuth();
  const basketId = useBasketId();
  const setBasketId = useBasketStore(state => state.setBasketId);

  // ⬇️ 2. 토큰/basketId 없으면 스캔으로
  useEffect(() => {
    if (!token) return;
    if (!basketId) router.replace('/scan');
  }, [token, basketId, router]);

  // ⬇️ 3. 활성화 필요시만 start 호출
  const [activateError, setActivateError] = useState<string | null>(null);
  const activatedBasketId = useActivatedBasketId();
  const needsActivation = basketId && (activatedBasketId !== basketId);
  const { mutate: activate, isPending } = useActivateBasket(basketId, token);

  // ⬇️ 4. 활성화 완료 후 SSE 재연결 트리거
  const triggerSSEReconnect = () => {
    console.log('[BasketsPage] SSE 재연결 트리거');
    reconnectGlobalSSE();
  };

  useEffect(() => {
    if (!token || !basketId) return;
    if (!needsActivation) return; // 이미 활성화
    activate(undefined, {
      onSuccess: () => {
        console.log('[BasketsPage] 활성화 성공 - SSE 재연결 예약');
        // 활성화 성공 후 짧은 지연으로 SSE 재연결 트리거
        setTimeout(() => {
          triggerSSEReconnect();
        }, 1000);
      },
      onError: () => {
        // 4. start 실패시 클린업 + scan
        localStorage.removeItem('basketId');
        localStorage.removeItem('activatedBasketId');
        setBasketId('');
        setActivateError('장바구니 활성화 실패! QR을 다시 찍어주세요.');
        router.replace('/scan');
      }
    });
  }, [token, basketId, needsActivation, activate, setBasketId, router]);

  // ⬇️ 5. 전역 SSE는 layout에서 실행되므로 store의 데이터만 사용
  const basket = useBasketData();
  const validItems = useMemo(() => {
    if (!basket || !basket.items) return [];
    return basket.items.filter(item => item && item.product && item.product.id);
  }, [basket]);
  
  // 디버깅용 로그
  useEffect(() => {
    console.log('[BasketsPage] basket 데이터 변경:', basket);
  }, [basket]);

  // 초기 데이터 로딩 상태 관리
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
  
  // 초기 데이터 로딩 확인
  useEffect(() => {
    if (basket && !isInitialDataLoaded) {
      console.log('[BasketsPage] 초기 데이터 로딩 완료');
      setIsInitialDataLoaded(true);
    }
  }, [basket, isInitialDataLoaded]);

  // ⬇️ 7. 수동 재연결 버튼 (테스트용)
  const handleReconnect = () => {
    reconnectGlobalSSE();
  };

  // ⬇️ 8. UI 분기 (로그인/QR 미스 등)
  if (!token) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ color: 'var(--foreground)' }}
      >
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold mb-2 text-center">로그인이 필요합니다</h2>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>장바구니를 사용하려면 먼저 로그인해주세요.</p>
        <button 
          className="w-full max-w-xs py-3 px-6 rounded-lg shadow-sm hover:opacity-80 transition-all"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
            color: 'var(--foreground)',
          }}
          onClick={() => router.push('/login')}
        >
          로그인 하러가기
        </button>
      </main>
    );
  }
  
  if (!basketId) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ color: 'var(--foreground)' }}
      >
        <Package className="w-12 h-12 text-blue-500 mb-4" />
        <h2 className="text-lg font-semibold mb-2 text-center">QR 코드를 스캔해주세요</h2>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>장바구니 QR 코드를 먼저 스캔해야 합니다.</p>
        <button 
          className="w-full max-w-xs py-3 px-6 rounded-lg shadow-sm hover:opacity-80 transition-all"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
            color: 'var(--foreground)',
          }}
          onClick={() => router.push('/scan')}
        >
          QR 스캔 하러가기
        </button>
      </main>
    );
  }
  
  if (isPending) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: 'var(--input-background)', color: 'var(--foreground)' }}
      >
        <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-semibold mb-2">장바구니 활성화 중...</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>잠시만 기다려주세요.</p>
      </main>
    );
  }
  
  if (activateError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: 'var(--input-background)', color: 'var(--foreground)' }}
      >
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold mb-2">활성화 실패</h2>
        <p className="text-red-500 text-sm mb-6 text-center">{activateError}</p>
        <button 
          className="w-full max-w-xs py-3 px-6 rounded-lg shadow-sm hover:opacity-80 transition-all"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
            color: 'var(--foreground)',
          }}
          onClick={() => router.push('/scan')}
        >
          다시 스캔하기
        </button>
      </main>
    );
  }
  
  // 장바구니가 비어있는 경우 (items가 없거나 빈 배열인 경우)
  if (!basket || !basket.items || basket.items.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: 'var(--input-background)', color: 'var(--foreground)' }}
      >
        <ShoppingBasket className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-lg font-semibold mb-2">장바구니가 비어있습니다</h2>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
          {!basket ? 'SSE 연결 대기 중...' : '아직 장바구니에 물품이 없습니다.'}
        </p>
        <div className="space-y-2">
          <button 
            className="w-full max-w-xs py-3 px-6 rounded-lg shadow-sm hover:opacity-80 transition-all"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
              color: 'var(--foreground)',
            }}
            onClick={handleReconnect}
          >
            SSE 재연결
          </button>
          <button 
            className="w-full max-w-xs py-2 px-6 rounded-lg shadow-sm hover:opacity-80 transition-all text-sm"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
              color: 'var(--foreground)',
            }}
            onClick={() => window.location.reload()}
          >
            페이지 새로고침
          </button>
        </div>
      </main>
    );
  }

  // 실제 장바구니 UI
  return (
    <main className="min-h-screen py-8 pb-24 flex flex-col items-center"
      style={{ 
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s',
        backgroundImage: `
          linear-gradient(var(--background-overlay), var(--background-overlay)),
          url('/paper2.jpg')
        `,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="w-full max-w-3xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <ShoppingBasket className="w-7 h-7 mr-2" style={{ color: 'var(--sobi-green)' }} />
            <h1 className="text-2xl font-bold">스마트 장바구니</h1>
          </div>
          <div className="text-xs px-3 py-1.5 rounded-full inline-block font-medium"
            style={{
              backgroundColor: 'var(--sobi-green-light)',
              border: '1px solid var(--sobi-green-border)',
              color: 'var(--sobi-green)',
            }}
          >
            장바구니 ID: {basketId}
          </div>
        </div>

        {/* 테스트용 버튼들 */}
        <div className="text-center mb-6 space-x-2">
          <button 
            onClick={handleReconnect}
            className="inline-flex items-center gap-2 py-2 px-4 text-sm rounded-lg hover:opacity-80 transition-all"
            style={{
              border: '1px solid var(--sobi-green-border)',
              backgroundColor: 'var(--sobi-green-light)',
              color: 'var(--sobi-green)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            SSE 재연결
          </button>
          <button 
            onClick={() => toast.success('테스트: 상품이 장바구니에 추가되었습니다')}
            className="inline-flex items-center gap-2 py-2 px-4 text-sm rounded-lg hover:opacity-80 transition-all"
            style={{
              border: '1px solid var(--sobi-green-border)',
              backgroundColor: 'var(--sobi-green-light)',
              color: 'var(--sobi-green)',
            }}
          >
            Toast 테스트
          </button>
        </div>

        {/* 요약 정보 */}
        <div className="mb-8 p-6 rounded-lg"
          style={{
            backgroundColor: 'var(--input-background)',
          }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <DollarSign className="w-6 h-6 mr-3" style={{ color: 'var(--sobi-green)' }} />
            결제 요약
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex justify-between items-center p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--input-background)',
              }}
            >
              <span className="text-base" style={{ color: 'var(--text-secondary)' }}>총 상품 품목</span>
              <span className="text-xl font-bold" style={{ color: 'var(--sobi-green)' }}>{basket.totalCount || 0}개</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--input-background)',
              }}
            >
              <span className="text-base" style={{ color: 'var(--text-secondary)' }}>총 상품 개수</span>
              <span className="text-xl font-bold" style={{ color: 'var(--sobi-green)' }}>
                {validItems.reduce((sum, item) => sum + item.quantity, 0)}개
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--input-background)',
              }}
            >
              <span className="text-base" style={{ color: 'var(--text-secondary)' }}>총 결제금액</span>
              <span className="text-2xl font-bold" style={{ color: 'var(--sobi-green)' }}>{(basket.totalPrice || 0).toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {/* 상품 목록 (기존 스타일) */}
        <div className="p-6 rounded-lg shadow-sm mb-8"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
          }}
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            상품 목록
          </h2>
          
          {(basket.items || []).length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBasket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>장바구니에 담긴 상품이 없습니다.</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>상품을 장바구니에 담아보세요!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {validItems.map((item: any) => (
                <div key={item.product.id} className="flex items-center p-4 rounded-lg hover:shadow-sm transition-all"
                  style={{
                    backgroundColor: 'var(--input-background)',
                  }}
                >
                  <Link href={`/products/${item.product.id}`} className="flex-shrink-0">
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      width={64}
                      height={64}
                      className="w-16 h-16 object-cover rounded-lg bg-white dark:bg-gray-600 hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  </Link>
                  <div className="flex-1 ml-4 min-w-0">
                    <Link href={`/products/${item.product.id}`} className="block hover:opacity-80 transition-opacity">
                      <h3 className="font-semibold text-lg truncate cursor-pointer">{item.product.name}</h3>
                    </Link>
                    <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {item.quantity}개 × {(item.product?.price || 0).toLocaleString()}원
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="font-bold text-xl" style={{ color: 'var(--sobi-green)' }}>
                      {(item.totalPrice || 0).toLocaleString()}원
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 물고기 애니메이션 수족관 */}
        <div className="p-6 rounded-lg shadow-sm mb-8"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
          }}
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            🐠 물고기 수족관
          </h2>
          <p className="text-sm mb-4 text-center" style={{ color: 'var(--text-secondary)' }}>
            상품들이 물고기처럼 자유롭게 헤엄치고 있어요! 클릭하면 상품 상세를 볼 수 있어요 🐟
          </p>
          
          {(basket.items || []).length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBasket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>장바구니에 담긴 상품이 없습니다.</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>상품을 장바구니에 담아보세요!</p>
            </div>
          ) : (
            <FishTankBackground items={validItems} />
          )}
        </div>
      </div>
    </main>
  );
}
