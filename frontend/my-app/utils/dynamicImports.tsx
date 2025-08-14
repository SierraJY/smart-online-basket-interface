// 코드 스플리팅을 위한 동적 임포트 유틸리티

import dynamic from 'next/dynamic';
import React from 'react';

/**
 * 기본 로딩 컴포넌트
 */
const DefaultLoading: React.FC = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
  </div>
);



/**
 * 동적 임포트 설정
 */
interface DynamicImportOptions {
  loading?: React.ComponentType<any>;
  error?: React.ComponentType<{ error: Error }>;
  ssr?: boolean;
}

/**
 * 페이지 컴포넌트 동적 임포트
 */
export function createLazyPage<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: DynamicImportOptions = {}
) {
  return dynamic(importFn, {
    loading: options.loading || DefaultLoading as any,
    ssr: options.ssr !== false, // 기본적으로 SSR 활성화
  });
}

/**
 * 모달 컴포넌트 동적 임포트 (SSR 비활성화)
 */
export function createLazyModal<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: DynamicImportOptions = {}
) {
  return dynamic(importFn, {
    loading: options.loading || DefaultLoading as any,
    ssr: false, // 모달은 클라이언트에서만 렌더링
  });
}

/**
 * 헤비 컴포넌트 동적 임포트
 */
export function createLazyHeavyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: DynamicImportOptions = {}
) {
  return dynamic(importFn, {
    loading: options.loading || DefaultLoading as any,
    ssr: options.ssr !== false,
  });
}

// 페이지별 동적 임포트 정의
export const LazyPages = {
  // 메인 페이지
  Home: createLazyPage(() => import('@/app/page')),
  
  // 상품 관련 페이지
  Products: createLazyPage(() => import('@/app/products/page')),
  ProductCategory: createLazyPage(() => import('@/app/products/category/page')),
  ProductDetail: createLazyPage(() => import('@/app/products/[id]/page')),
  
  // 장바구니 페이지
  Baskets: createLazyPage(() => import('@/app/baskets/page')),
  
  // 스캔 페이지
  Scan: createLazyPage(() => import('@/app/scan/page')),
  
  // 인증 페이지
  Login: createLazyPage(() => import('@/app/login/page')),
  Signup: createLazyPage(() => import('@/app/signup/page')),
};

// 모달별 동적 임포트 정의
export const LazyModals = {
  CategoryModal: createLazyModal(() => import('@/components/modals/CategoryModal')),
};



/**
 * 조건부 동적 임포트
 */
export function createConditionalLazyImport<T extends React.ComponentType<any>>(
  condition: () => boolean,
  importFn: () => Promise<{ default: T }>,
  fallback: T,
  options: DynamicImportOptions = {}
) {
  return dynamic(
    () => {
      if (condition()) {
        return importFn();
      }
      return Promise.resolve({ default: fallback });
    },
    {
      loading: options.loading || DefaultLoading as any,
      ssr: options.ssr !== false,
    }
  );
}

/**
 * 사용 예시:
 * 
 * // 페이지에서 사용
 * const LazyProductDetail = LazyPages.ProductDetail;
 * 
 * // 모달에서 사용
 * const LazyCategoryModal = LazyModals.CategoryModal;
 * 
 * // 조건부 로딩
 * const ConditionalComponent = createConditionalLazyImport(
 *   () => process.env.NODE_ENV === 'development',
 *   () => import('./DevTools'),
 *   () => <div>Production Mode</div>
 * );
 */ 