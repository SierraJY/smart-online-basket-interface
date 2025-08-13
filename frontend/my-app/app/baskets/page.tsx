// 장바구니 페이지

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useBasketId, useActivatedBasketId, useBasketData, useBasketStore, useSetHasNewItems } from '@/store/useBasketStore';
import { useAuth } from '@/utils/hooks/useAuth';
import { useActivateBasket } from '@/utils/hooks/useActivateBasket';
import { reconnectGlobalSSE, useSSEConnectionStatus, useSSEErrorInfo } from '@/utils/hooks/useGlobalBasketSSE';
import { basketStorage } from '@/utils/storage';
import { ShoppingBasket, AlertCircle } from 'lucide-react';
import ToastManager from '@/utils/toastManager';
import { apiClient } from '@/utils/api/apiClient';
import { config } from '@/config/env';
import { Product, BasketItem } from '@/types';



export default function BasketsPage() {
  const router = useRouter();
  const { accessToken: token } = useAuth();
  const basketId = useBasketId();
  const setBasketId = useBasketStore(state => state.setBasketId);
  const resetIntroSeen = useBasketStore(s => s.resetIntroSeen);
  const setHasNewItems = useSetHasNewItems();
  
  // SSE 연결 상태 및 에러 정보 구독
  const sseStatus = useSSEConnectionStatus();
  const sseError = useSSEErrorInfo();

  // 장바구니 페이지 진입 시 다크모드 강제 해제
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, []);

  // 2. 토큰/basketId 없으면 스캔으로 (결제 완료 후에는 제외)
  const [isCheckoutCompleted, setIsCheckoutCompleted] = useState(false);
  
  useEffect(() => {
    if (!token) return;
    if (!basketId && !isCheckoutCompleted) router.replace('/scan');
  }, [token, basketId, router, isCheckoutCompleted]);

  // 3. 활성화 필요시만 start 호출
  const [activateError, setActivateError] = useState<string | null>(null);
  const activatedBasketId = useActivatedBasketId();
  const needsActivation = basketId && (activatedBasketId !== basketId);
  const { mutate: activate, isPending } = useActivateBasket(basketId, token);

  // 4. SSE 재연결은 이제 사용자 버튼 클릭 시에만 실행

  useEffect(() => {
    if (!token || !basketId) return;
    if (!needsActivation) return; // 이미 활성화
    activate(undefined, {
      onSuccess: async () => {
        console.log('[BasketsPage] 활성화 성공 - 사용자 버튼 클릭 대기');
        // 활성화만 완료하고, SSE 연결은 사용자가 버튼을 클릭할 때까지 대기
        console.log('[BasketsPage] 활성화 완료! 원형 버튼을 눌러 연결을 시작하세요.');
        // triggerSSEReconnect(); // 자동 연결 제거
      },
      onError: async () => {
        // 4. start 실패시 완전한 클린업 + scan
        try {
          await basketStorage.clearComplete();
        } catch (e) {
          console.warn('[BasketsPage] 활성화 실패 시 정리 중 경고:', e);
        }
        setActivateError('장바구니 활성화 실패! QR을 다시 찍어주세요.');
        router.replace('/scan');
      }
    });
  }, [token, basketId, needsActivation, activate, setBasketId, router]);

  // 5. 전역 SSE는 layout에서 실행되므로 store의 데이터만 사용
  const basket = useBasketData();
  const validItems = useMemo(() => {
    if (!basket || !basket.items) return [];
    return basket.items.filter(item => item && item.product && item.product.id);
  }, [basket]);
  
  // AI 추천 상품들
  const recommendations = useMemo(() => {
    if (!basket || !basket.recommendations) return [];
    return basket.recommendations.filter(rec => rec && rec.id);
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

  // 시작 버튼 클릭 전까지 본문 비노출 + 런칭 애니메이션
  const [uiStarted, setUiStarted] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  // 버튼 노출 여부를 저장소(introSeenMap)로 관리
  const hasIntroSeen = useBasketStore(s => s.hasIntroSeen);
  const markIntroSeen = useBasketStore(s => s.markIntroSeen);
  useEffect(() => {
    if (!basketId) return;
    setUiStarted(hasIntroSeen(basketId));
  }, [basketId, hasIntroSeen]);

  // 장바구니 페이지 진입 시 새로운 상품 알림 해제
  useEffect(() => {
    if (uiStarted) {
      setHasNewItems(false);
      console.log("[BasketsPage] 새로운 상품 알림 해제");
    }
  }, [uiStarted, setHasNewItems]);
  
  // SSE 에러 발생 시 토스트 알림 (단순화)
  useEffect(() => {
    if (sseError) {
      ToastManager.sseGeneralError(sseError.message);
    }
  }, [sseError]);
  const handleStartBasket = useCallback(async () => {
    try {
      console.log('[BasketsPage] 장바구니 시작/재연결 요청');
      
      // 활성화 상태 확인
      if (activatedBasketId !== basketId) {
        console.log('[BasketsPage] 아직 활성화되지 않음 - 활성화 대기');
        ToastManager.basketActivationPending();
        return;
      }
      
      console.log('[BasketsPage] 활성화 확인 완료 - SSE 연결 시작');
      
      // SSE 연결 - 첫 연결과 재연결을 동일하게 처리
      console.log('[BasketsPage] SSE 연결 시작 (첫 연결과 재연결 동일 조건)');
      reconnectGlobalSSE();
      
      // UI 시작 처리
      if (!uiStarted) {
        if (basketId) markIntroSeen(basketId);
        setLaunching(true);
      } else {
        // 재연결 피드백
        ToastManager.basketReconnecting();
      }
    } catch (error) {
      console.error('[BasketsPage] 장바구니 시작/재연결 실패:', error);
      ToastManager.basketConnectionFailed();
    }
  }, [uiStarted, basketId, activatedBasketId, markIntroSeen]);

  // 결제 완료 함수
  const handleCheckout = useCallback(async () => {
    if (!token) {
      ToastManager.basketLoginRequired();
      return;
    }

    if (!basket || !basket.items || basket.items.length === 0) {
      ToastManager.basketEmpty();
      return;
    }

    try {
      ToastManager.basketCheckoutProcessing();
      
      // 토큰 확인 로그
      console.log('결제 요청 - 토큰 확인:', token.substring(0, 50) + '...');
      
      const response = await apiClient.post(config.API_ENDPOINTS.BASKET_CHECKOUT, {}, true);
      
      if (response.ok) {
        const result = await response.json();
        ToastManager.basketCheckoutSuccess();
        console.log('결제 결과:', result);
        
        // 결제 완료 후 장바구니 완전 초기화
        try {
          await basketStorage.clearComplete();
        } catch (e) {
          console.warn('[BasketsPage] 결제 완료 후 정리 중 경고:', e);
        }
        setIsCheckoutCompleted(true); // 결제 완료 플래그 설정
        
        // 버튼 초기화 (다음 사용 시 다시 노출)
        if (basketId) resetIntroSeen(basketId);
        // 프로필 페이지로 이동
        router.push('/profile');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('결제 실패:', errorData);
        
        // 데이터베이스 오류인 경우 사용자 친화적인 메시지
        if (errorData.error && errorData.error.includes('receipt_pkey')) {
          ToastManager.basketCheckoutDatabaseError();
        } else {
          ToastManager.basketCheckoutFailed(errorData.error || errorData.message || '알 수 없는 오류');
        }
      }
    } catch (error) {
      console.error('결제 요청 오류:', error);
      ToastManager.basketCheckoutNetworkError();
    }
  }, [token, basket, router, basketId, resetIntroSeen]);

  // 7. 장바구니 취소 함수
  const handleBasketCancel = useCallback(async () => {
    if (!token) {
      ToastManager.basketLoginRequired();
      return;
    }

    // 장바구니에 상품이 있을 때는 취소 불가
    if (basket && basket.items && basket.items.length > 0) {
      ToastManager.basketDisconnectRequiresEmpty();
      return;
    }

    try {
      ToastManager.basketCancelProcessing();
      
      const response = await apiClient.post(config.API_ENDPOINTS.BASKET_CANCEL, {}, true);
      
      if (response.ok) {
        const result = await response.json();
        console.log('장바구니 취소 결과:', result);
        
        // 장바구니 취소 후 완전 초기화
        try {
          await basketStorage.clearComplete();
        } catch (e) {
          console.warn('[BasketsPage] 장바구니 취소 후 정리 중 경고:', e);
        }
        
        ToastManager.basketCancelSuccess();
        
        // 버튼 초기화 (다음 사용 시 다시 노출)
        if (basketId) resetIntroSeen(basketId);
        
        // 스캔 페이지로 이동
        router.push('/scan');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('장바구니 취소 실패:', errorData);
        
        if (errorData.error) {
          ToastManager.basketCancelFailed(errorData.error);
        } else {
          ToastManager.basketCancelFailed('알 수 없는 오류가 발생했습니다.');
        }
      }
    } catch (error) {
      console.error('장바구니 취소 요청 오류:', error);
      ToastManager.basketCancelNetworkError();
    }
  }, [token, basket, basketId, resetIntroSeen, router]);

  // 8. UI 분기 (로그인/QR 미스 등)
  if (!token) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
        style={{ color: 'var(--foreground)' }}
      >
        {/* AI 특별 배경 - 로그인 필요 상태 */}
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
        </div>
      </main>
    );
  }
  
  if (isPending) {
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
          <h2 className="text-lg font-semibold mb-2">장바구니 활성화 중...</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>잠시만 기다려주세요.</p>
        </div>
      </main>
    );
  }
  
  if (activateError) {
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
        </div>
      </main>
    );
  }
  


  // 실제 장바구니 UI
  return (
    <main className="min-h-screen py-8 pb-24 flex flex-col items-center relative overflow-hidden"
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
      
      <div className="w-full max-w-3xl pt-8 relative z-10">
        <div className="text-center mb-8">
          {/* SSE 연결 상태 표시 */}
          <div className="mt-3">
            {sseStatus === 'connecting' && (
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                연결 중...
              </div>
            )}
            {sseStatus === 'connected' && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                연결됨
              </div>
            )}
            {sseStatus === 'error' && (
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  연결 오류 발생
                </div>
                {sseError && (
                  <div className="text-xs text-red-500 max-w-md text-center">
                    {sseError.message}
                  </div>
                )}
              </div>
            )}
            {sseStatus === 'connecting' && (
              <div className="flex items-center justify-center gap-2 text-sm text-orange-600">
                <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                연결 중...
              </div>
            )}
            {sseStatus === 'disconnected' && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                연결 끊김
              </div>
            )}
          </div>
        </div>

        {/* 초기 진입: 중앙 원형 버튼 */}
        {!uiStarted && (
          <div className="flex flex-col items-center justify-center mb-6" style={{ minHeight: '40vh' }}>
            <motion.div
              className="relative"
              initial={{ opacity: 1, scale: 1 }}
              animate={launching ? { scale: 30, opacity: 0 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              onAnimationComplete={() => {
                if (launching) {
                  setUiStarted(true);
                  setLaunching(false);
                }
              }}
            >
              {/* 외곽 글로우 (강조) */}
              <motion.div
                className="absolute inset-0 rounded-full blur-3xl"
                style={{
                  background:
                    'radial-gradient(circle at 25% 30%, var(--sobi-green), transparent 55%),\
                     radial-gradient(circle at 75% 70%, var(--sobi-green-light), transparent 60%)',
                  filter: 'saturate(1.15)',
                  zIndex: 0
                }}
                animate={{ opacity: [0.45, 0.95, 0.45], scale: [1, 1.2, 1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* 실제 테두리 wobble (절제됨) */}
              <svg
                className="absolute inset-0"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ transform: 'scale(1.07)', pointerEvents: 'none' }}
              >
                <defs>
                  <filter id="wobble-filter">
                    <feTurbulence type="fractalNoise" baseFrequency="0.31" numOctaves="2" seed="3" result="noise">
                      <animate attributeName="baseFrequency" dur="6s" values="0.01;0.015;0.01" repeatCount="indefinite" />
                    </feTurbulence>
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="var(--sobi-green)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="url(#wobble-filter)"
                />
              </svg>

              {/* 퍼지는 파티클(가루) 효과 */}
              {Array.from({ length: 10 }).map((_, i) => {
                const angle = (i / 10) * 360;
                const initialR = 90; // 버튼 외곽
                const finalR = 130;  // 약간만 더 바깥
                const size = i % 3 === 0 ? 5 : 4;
                const color = i % 2 === 0 ? 'var(--sobi-green)' : 'rgba(61, 110, 55, 0.6)';
                return (
                  <motion.span
                    key={`dust-${i}`}
                    className="absolute"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: `${size}px`,
                      height: `${size}px`,
                      borderRadius: '50%',
                      background: color,
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translate(${initialR}px, 0)`,
                      zIndex: 2,
                      pointerEvents: 'none',
                      willChange: 'transform, opacity'
                    }}
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{
                      transform: [`translate(-50%, -50%) rotate(${angle}deg) translate(${initialR}px, 0)`,
                                  `translate(-50%, -50%) rotate(${angle}deg) translate(${finalR}px, 0)`],
                      opacity: [0.5, 0],
                      scale: [1, 0.8]
                    }}
                    transition={{ duration: 2.2, delay: i * 0.1, repeat: Infinity, repeatDelay: 0.6, ease: 'easeOut' }}
                  />
                );
              })}

              {/* 버튼 (내부 그라데이션 레이어가 더 강하게 움직임) */}
              <motion.button
                onClick={handleStartBasket}
                className="relative w-44 h-44 md:w-52 md:h-52 rounded-full overflow-hidden text-xl font-extrabold shadow-2xl hover:shadow-[0_20px_60px_rgba(34,197,94,0.45)] transition-shadow duration-300 ring-4 ring-white/20"
                onPointerDown={() => setIsPressing(true)}
                onPointerUp={() => setIsPressing(false)}
                onPointerLeave={() => setIsPressing(false)}
                onPointerCancel={() => setIsPressing(false)}
                onTouchStart={() => setIsPressing(true)}
                onTouchEnd={() => setIsPressing(false)}
                animate={isPressing ? { scale: 1.7 } : { scale: 1 }}
                transition={{ 
                  scale: {
                    duration: isPressing ? 5 : 2, // 눌렀을 때: 5초, 뗐을 때: 2초
                    ease: isPressing ? 'easeOut' : 'easeInOut'
                  }
                }}
                style={{ color: 'white', border: 'none', zIndex: 1 }}
              >
                {/* 움직이는 선형 그라데이션 */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--sobi-green-light), var(--sobi-green), #16a34a, #22c55e)',
                    backgroundSize: '320% 320%'
                  }}
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* 회전하는 원뿔(Conic) 그라데이션 오버레이 */}
                <motion.div
                  className="absolute inset-0 opacity-45 mix-blend-screen"
                  style={{
                    background:
                      'conic-gradient(from 0deg, rgba(255,255,255,0.18), rgba(34,197,94,0.3), rgba(34,197,94,0.4), rgba(255,255,255,0.18))'
                  }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                />
                {/* 중앙 하이라이트 강조 */}
                <motion.div
                  className="absolute inset-0"
                  style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.3), transparent 55%)' }}
                  animate={{ opacity: [0.25, 0.5, 0.25] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* <div className="relative z-10 flex items-center justify-center">
                  <motion.div
                    className="absolute w-24 h-24 md:w-28 md:h-28 rounded-full bg-white/10 blur-md"
                    animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.05, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span
                    className="relative text-[40px] md:text-3xl font-extrabold tracking-tight"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}
                  >
                    CONNECT
                  </span>
                </div> */}
              </motion.button>
            </motion.div>
            
            {/* 안내 문구 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-4 text-center"
            >
              <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
                버튼을 눌러 스마트 장바구니와 함께<br /> 편리한 쇼핑을 시작하세요!
              </p>
            </motion.div>
          </div>
        )}

        {/* 시작 이후: 상단 재연결 버튼 */}
        {uiStarted && (
          <div className="text-center mb-2">
            <button 
              onClick={handleStartBasket}
              disabled={sseStatus === 'connecting'}
              className="w-full max-w-xs inline-flex items-center justify-center gap-3 py-3 px-6 text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--sobi-green-light)',
                color: 'var(--sobi-green)',
                border: '1px solid var(--sobi-green-border)',
              }}
            >
              {sseStatus === 'connecting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  연결 중...
                </>
              ) : sseStatus === 'connected' ? (
                '장바구니 재연결'
              ) : (
                '장바구니 연결'
              )}
            </button>
          </div>
        )}

        {uiStarted && (
        <div className="mb-3 p-3 rounded-lg">
          <div className="flex justify-center items-center gap-8 mb-1">
            <span className="text-[18px]" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--sobi-green)', fontWeight: 'bold' }}>{basket?.totalCount || 0}</span>개 품목
            </span>
            <span className="text-[18px]" style={{ color: 'var(--text-secondary)' }}>
              총 상품 <span style={{ color: 'var(--sobi-green)', fontWeight: 'bold' }}>{validItems.reduce((sum, item) => sum + item.quantity, 0)}개</span>
            </span>
          </div>
          <div className="flex justify-center items-center gap-8 p-2 rounded-lg">
            <span className="text-[24px]" style={{ color: 'var(--text-secondary)' }}>총 결제금액</span>
            <span className="text-[28px] font-bold" style={{ color: 'var(--sobi-green)' }}>{(basket?.totalPrice || 0).toLocaleString()}원</span>
          </div>
          
          {/* 연결 해제 및 결제 완료 버튼 */}
          <div className="text-center flex flex-row gap-2 justify-center">
            <button
              onClick={handleBasketCancel}
              className={`inline-flex items-center gap-3 py-4 px-8 text-lg font-semibold rounded-full shadow-lg transition-all duration-300 ${
                basket && basket.items && basket.items.length > 0 
                  ? 'opacity-30 cursor-not-allowed' 
                  : 'hover:shadow-xl'
              }`}
              style={{
                backgroundColor: 'var(--sobi-green)',
                color: 'white',
                border: 'none',
              }}
            >
              연결 해제
            </button>
            
            <button
              onClick={handleCheckout}
              disabled={!basket || !basket.items || basket.items.length === 0}
              className="inline-flex items-center gap-3 py-4 px-8 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-30"
              style={{
                backgroundColor: 'var(--sobi-green)',
                color: 'white',
                border: 'none',
              }}
            >
              결제 완료
              {/* <span className="text-sm font-normal opacity-90">
                ({(basket?.totalPrice || 0).toLocaleString()}원)
              </span> */}
            </button>
          </div>
        </div>
        )}

        {uiStarted && (
        <div className="p-4 rounded-lg shadow-sm mb-4"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            상품 목록
          </h2>
          
          {(basket?.items || []).length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBasket className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-base" style={{ color: 'var(--text-secondary)' }}>장바구니에 담긴 상품이 없습니다.</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>상품을 장바구니에 담아보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {validItems.map((item: BasketItem) => (
                item.product && (
                  <div key={item.product.id} className="flex items-center p-3 rounded-lg hover:shadow-sm transition-all"
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
                      {(item.totalPrice || 0).toLocaleString()}원 x {item.quantity}개
                      </p>
                      
                      {/* 태그 */}
                      {item.product.tag && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.product.tag.split(' ').slice(0, 2).map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="text-xs px-2 py-1 rounded-full"
                              style={{
                                backgroundColor: 'var(--sobi-green-light)',
                                color: 'var(--sobi-green)',
                                border: '1px solid var(--sobi-green-border)',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className="font-bold text-xl" style={{ color: 'var(--sobi-green)' }}>
                        {(item.totalPrice || 0).toLocaleString()}원
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
        )}

        {uiStarted && (
        <div className="p-4 rounded-lg shadow-sm mb-4"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            AI 추천 상품
          </h2>
          
          {recommendations.length > 0 ? (
            <>
              <p className="text-sm mb-3 text-center" style={{ color: 'var(--text-secondary)' }}>
                AI가 당신의 장바구니를 분석해서 추천하는 상품들입니다! 실시간으로 업데이트됩니다
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {recommendations.slice(0, 4).map((product: Product) => (
                  <Link key={product.id} href={`/products/${product.id}`}>
                    <div className="group cursor-pointer">
                      <div className="relative overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group-hover:scale-105">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={200}
                          height={200}
                          className="w-full h-32 object-cover"
                        />
                        
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
                      
                      <div className="mt-3">
                        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-green-600 transition-colors">
                          {product.name}
                        </h3>
                        <div className="mt-1 flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            {product.discountRate > 0 ? (
                              <>
                                <span className="text-xs text-gray-500 line-through">
                                  {product.price.toLocaleString()}원
                                </span>
                                <span className="text-sm font-bold text-red-600">
                                  {product.discountedPrice?.toLocaleString() || product.price.toLocaleString()}원
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-bold">
                                {product.price.toLocaleString()}원
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            재고: {product.stock}개
                          </span>
                        </div>
                        
                        {/* 태그 */}
                        {product.tag && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {product.tag.split(' ').slice(0, 2).map((tag: string, index: number) => (
                              <span
                                key={index}
                                className="text-xs px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: 'var(--sobi-green-light)',
                                  color: 'var(--sobi-green)',
                                  border: '1px solid var(--sobi-green-border)',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              {recommendations.length > 4 && (
                <div className="text-center">
                  <Link 
                    href="/ai"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                    style={{
                      backgroundColor: 'var(--sobi-green)',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(66, 184, 131, 0.3)'
                    }}
                  >
                    <span>더 많은 AI 추천 상품 보기</span>
                    <span className="text-sm opacity-90">({recommendations.length}개)</span>
                  </Link>
                </div>
              )}
            </>
                      ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'var(--sobi-green-light)',
                  border: '2px solid var(--sobi-green-border)',
                }}
              >
                <span className="text-lg">empty</span>
              </div>
              <h3 className="text-base font-semibold mb-1">AI 추천 상품</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                장바구니에 상품을 담으면 추천 상품이 나옵니다!
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                AI가 사용자의 구매 패턴을 분석해서 맞춤 상품을 추천해드려요
              </p>
            </div>
          )}
        </div>
        )}


      </div>
    </main>
  );
}
