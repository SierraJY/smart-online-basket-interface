'use client';

import { useGlobalBasketSSE } from "@/utils/hooks/useGlobalBasketSSE";

// 전역 SSE 연결 관리 컴포넌트
// 이 컴포넌트는 layout.tsx에서 사용되어 앱 전체에서 SSE 연결을 유지
export default function GlobalBasketSSE() {
  // 전역 SSE 연결 시작 (데이터는 사용하지 않음, 연결만 유지)
  useGlobalBasketSSE();
  
  // 이 컴포넌트는 UI를 렌더링하지 않음 (백그라운드에서만 동작)
  return null;
} 