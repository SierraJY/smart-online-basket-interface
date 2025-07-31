// 장바구니 페이지

'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useBasketStore } from "@/store/useBasketStore";
import { useAuth } from "@/utils/hooks/useAuth";
import { useActivateBasket } from "@/utils/hooks/useActivateBasket";
import { ShoppingBasket, RefreshCw, AlertCircle, Package, DollarSign } from 'lucide-react';

export default function BasketsPage() {
  const router = useRouter();
  const { accessToken: token } = useAuth();
  const basketId = useBasketStore(s => s.basketId);
  const setBasketId = useBasketStore(s => s.setBasketId);

  // ⬇️ 2. 토큰/basketId 없으면 스캔으로
  useEffect(() => {
    if (!token) return;
    if (!basketId) router.replace('/scan');
  }, [token, basketId, router]);

  // ⬇️ 3. 활성화 필요시만 start 호출
  const [activateError, setActivateError] = useState<string | null>(null);
  const activatedBasketId = useBasketStore(s => s.activatedBasketId);
  const needsActivation = basketId && (activatedBasketId !== basketId);
  const { mutate: activate, isPending } = useActivateBasket(basketId, token);

  // ⬇️ 4. 활성화 완료 후 SSE 재연결 트리거
  const [activationCompleted, setActivationCompleted] = useState(false);

  useEffect(() => {
    if (!token || !basketId) return;
    if (!needsActivation) return; // 이미 활성화
    activate(undefined, {
      onSuccess: () => {
        // 활성화 성공 후 짧은 지연으로 SSE 재연결 트리거
        setTimeout(() => {
          setActivationCompleted(true);
          if (typeof window !== 'undefined' && (window as any).triggerSSEReconnect) {
            (window as any).triggerSSEReconnect();
          }
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
    // eslint-disable-next-line
  }, [token, basketId, needsActivation, activate, setBasketId, router]);

  // ⬇️ 5. 전역 SSE는 layout에서 실행되므로 store의 데이터만 사용
  const basket = useBasketStore(s => s.basketData);
  const setBasketData = useBasketStore(s => s.setBasketData);

  // ⬇️ 7. 수동 재연결 버튼 (테스트용)
  const handleReconnect = () => {
    if (typeof window !== 'undefined' && (window as any).triggerSSEReconnect) {
      (window as any).triggerSSEReconnect();
    }
  };

  // ⬇️ 8. UI 분기 (로그인/QR 미스 등)
  if (!token) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: 'var(--input-background)', color: 'var(--foreground)' }}
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
        style={{ background: 'var(--input-background)', color: 'var(--foreground)' }}
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
        style={{ background: 'var(--input-background)', color: 'var(--foreground)' }}
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
        style={{ background: 'var(--input-background)', color: 'var(--foreground)' }}
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
  
  if (!basket) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: 'var(--input-background)', color: 'var(--foreground)' }}
      >
        <ShoppingBasket className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-lg font-semibold mb-2">장바구니가 비어있습니다</h2>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>아직 장바구니에 물품이 없습니다.</p>
        <button 
          className="w-full max-w-xs py-3 px-6 rounded-lg shadow-sm hover:opacity-80 transition-all"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
            color: 'var(--foreground)',
          }}
          onClick={handleReconnect}
        >
          새로고침
        </button>
      </main>
    );
  }

  // 실제 장바구니 UI
  return (
    <main className="min-h-screen px-4 py-10 pb-24 flex flex-col items-center"
      style={{ 
        background: 'var(--input-background)', 
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}
    >
      <div className="w-full max-w-4xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShoppingBasket className="w-8 h-8 text-green-600 mr-3" />
            <h1 className="text-3xl font-bold">스마트 장바구니</h1>
          </div>
          <div className="text-sm px-4 py-2 rounded-full inline-block"
            style={{
              backgroundColor: 'var(--input-background)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-secondary)',
            }}
          >
            장바구니 ID: {basketId}
          </div>
        </div>

        {/* 테스트용 재연결 버튼 */}
        <div className="text-center mb-6">
          <button 
            onClick={handleReconnect}
            className="inline-flex items-center gap-2 py-2 px-4 text-sm rounded-lg hover:opacity-80 transition-all"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
              color: 'var(--foreground)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            SSE 재연결
          </button>
        </div>

        {/* 요약 정보 */}
        <div className="mb-8 p-6 rounded-lg shadow-sm"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
          }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <DollarSign className="w-6 h-6 mr-3 text-green-600" />
            결제 요약
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--input-background)',
                border: '1px solid var(--input-border)',
              }}
            >
              <span className="text-base" style={{ color: 'var(--text-secondary)' }}>상품 개수</span>
              <span className="text-xl font-bold text-green-600">{basket.totalCount}개</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--input-background)',
                border: '1px solid var(--input-border)',
              }}
            >
              <span className="text-base" style={{ color: 'var(--text-secondary)' }}>총 결제금액</span>
              <span className="text-2xl font-bold text-green-600">{basket.totalPrice.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {/* 상품 목록 */}
        <div className="p-6 rounded-lg shadow-sm"
          style={{
            border: '1px solid var(--input-border)',
            backgroundColor: 'var(--input-background)',
          }}
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <Package className="w-6 h-6 mr-3 text-green-600" />
            상품 목록
          </h2>
          
          {basket.items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBasket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>장바구니에 담긴 상품이 없습니다.</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>상품을 장바구니에 담아보세요!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {basket.items.map((item: any) => (
                <div key={item.product.id} className="flex items-center p-4 rounded-lg hover:shadow-sm transition-all"
                  style={{
                    backgroundColor: 'var(--input-background)',
                    border: '1px solid var(--input-border)',
                  }}
                >
                  <Link href={`/products/${item.product.id}`} className="flex-shrink-0">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-lg bg-white dark:bg-gray-600 hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  </Link>
                  <div className="flex-1 ml-4 min-w-0">
                    <Link href={`/products/${item.product.id}`} className="block hover:opacity-80 transition-opacity">
                      <h3 className="font-semibold text-lg truncate cursor-pointer">{item.product.name}</h3>
                    </Link>
                    <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {item.quantity}개 × {item.product.price.toLocaleString()}원
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="font-bold text-green-600 text-xl">
                      {item.totalPrice.toLocaleString()}원
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
