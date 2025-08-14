'use client';

import { useEffect } from "react";
import { useGlobalBasketSSE } from "@/utils/hooks/useGlobalBasketSSE";

// 전역 SSE 연결 관리 컴포넌트
// 이 컴포넌트는 layout.tsx에서 사용되어 앱 전체에서 SSE 연결을 유지
export default function GlobalBasketSSE() {
  // 전역 SSE 연결 시작 (자동 연결 활성화)
  const basket = useGlobalBasketSSE();
  
  // 연결 상태 로깅 (디버깅용)
  useEffect(() => {
    if (basket) {
      console.log('[GlobalBasketSSE] 전역 SSE 연결 유지 중 - 상품 수:', basket.items?.length || 0);
    }
  }, [basket]);
  
  // 이 컴포넌트는 UI를 렌더링하지 않음 (백그라운드에서만 동작)
  return null;
} 