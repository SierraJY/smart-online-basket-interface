'use client'

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useBasketStore } from '@/store/useBasketStore';
import { useBasketSSE } from '@/utils/hooks/useBasketSSE';

export default function BasketsPage() {
  const router = useRouter();
  const boardMac = useBasketStore(state => state.boardMac);
  const token = useAuthStore(state => state.accessToken);

  // [1] POST /api/baskets/start/boardMac 로 활성화 → 성공해야 SSE 연결
  const [activated, setActivated] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const requestedRef = useRef(false);

    useEffect(() => {
    // store 값이 undefined였다가, 값이 들어오며 useEffect가 두 번 이상 타는지 반드시 확인!
    console.log("boardMac:", boardMac, "token:", token, "requestedRef:", requestedRef.current);
    
    if (!boardMac || !token || requestedRef.current) return;

    requestedRef.current = true;

    setActivating(true);
    setActivated(false);
    setActivateError(null);

    fetch(`http://localhost:8080/api/baskets/start/${boardMac}`, {
        method: 'POST',
        headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        }
    })
        .then(res => {
        setActivating(false);
        if (!res.ok) {
            requestedRef.current = false; // 여기서도 false로!
            throw new Error('장바구니 활성화 실패');
        }
        setActivated(true);
        })
        .catch(e => {
        setActivating(false);
        setActivateError(e.message || '장바구니 활성화 에러');
        requestedRef.current = false;
        });
    }, [boardMac, token]);

  // [2] POST 성공시만 SSE 연결!
  const basket = useBasketSSE(activated ? boardMac : null, activated ? token : null);

  // [3] UI 분기
  if (!token) return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center">
      <div className="text-lg font-bold mb-4">로그인이 필요합니다</div>
      <button
        className="px-4 py-2 rounded-xl bg-green-600 text-white"
        onClick={() => router.push('/login')}
      >로그인 하러가기</button>
    </div>
  );

  if (!boardMac) return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center">
      <div className="text-lg font-bold mb-4">장바구니 QR을 먼저 찍어주세요</div>
      <button
        className="px-4 py-2 rounded-xl bg-emerald-700 text-white"
        onClick={() => router.push('/scan')}
      >QR스캔 하러가기</button>
    </div>
  );

  if (activating) return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <span className="animate-spin">⏳</span> 장바구니 활성화 중...
    </div>
  );
  if (activateError) return (
    <div className="min-h-[40vh] flex items-center justify-center text-red-500">
      장바구니 활성화 실패: {activateError}
    </div>
  );

  if (!basket) return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <span className="animate-spin">⏳</span> 장바구니 정보를 불러오는 중...
    </div>
  );

  // [4] 장바구니 실시간 뷰
  return (
    <main className="max-w-lg mx-auto px-3 py-8">
      <h1 className="text-2xl font-bold mb-2 text-center">스마트 장바구니</h1>
      <div className="text-sm text-gray-500 mb-6 text-center">
        <span className="font-mono text-emerald-600">{boardMac}</span>
      </div>
      <section className="mb-6">
        <div className="flex justify-between mb-1">
          <span className="font-semibold">상품 개수</span>
          <span>{basket.totalCount}개</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">총합</span>
          <span className="font-bold text-lg text-green-600">{basket.totalPrice.toLocaleString()}원</span>
        </div>
      </section>
      <section>
        <ul>
          {basket.items.length === 0 && (
            <li className="text-center text-gray-400">장바구니에 담긴 상품이 없습니다.</li>
          )}
          {basket.items.map((item: any) => (
            <li
              key={item.product.id}
              className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  className="w-14 h-14 object-cover rounded-lg bg-gray-50 dark:bg-gray-900"
                />
                <div>
                  <div className="font-semibold">{item.product.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.quantity}개 &times; {item.product.price.toLocaleString()}원
                  </div>
                </div>
              </div>
              <div className="font-bold text-green-600">
                {item.totalPrice.toLocaleString()}원
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
