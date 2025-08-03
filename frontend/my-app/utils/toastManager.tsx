import React from 'react';
import toast from 'react-hot-toast';

// Toast 타입 정의
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Toast 위치 정의
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

// Toast 설정 인터페이스
interface ToastConfig {
  position?: ToastPosition;
  duration?: number;
  style?: React.CSSProperties;
}

// 기본 toast 설정
const defaultConfig: ToastConfig = {
  position: 'top-center',
  duration: 3000,
  style: {
    background: 'var(--footer-background)',
    color: 'var(--foreground)',
    border: '1px solid var(--footer-border)',
  },
};

// 성공 toast 설정
const successConfig: ToastConfig = {
  position: 'top-center',
  duration: 3000,
  style: {
    background: '#10b981',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    padding: '12px 16px',
    minWidth: '280px',
  },
};

// 찜 관련 toast 설정
const favoriteConfig: ToastConfig = {
  position: 'bottom-center',
  duration: 2000,
  style: {
    background: '#10b981',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    padding: '10px 16px',
  },
};

// 인증 관련 toast 설정
const authConfig: ToastConfig = {
  position: 'top-center',
  duration: 2500,
  style: {
    background: '#3b82f6',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    padding: '12px 16px',
    minWidth: '280px',
  },
};

// Toast 관리자 클래스
class ToastManager {
  // 기본 toast
  static show(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast(message, finalConfig);
  }

  // 성공 toast
  static success(message: string, config?: ToastConfig) {
    const finalConfig = { ...successConfig, ...config };
    return toast.success(message, finalConfig);
  }

  // 에러 toast
  static error(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(message, finalConfig);
  }

  // 찜 관련 toast
  static favorite(message: string, config?: ToastConfig) {
    const finalConfig = { ...favoriteConfig, ...config };
    return toast.success(message, finalConfig);
  }

  // 로그인 성공 toast
  static loginSuccess(userId: string, config?: ToastConfig) {
    const finalConfig = { ...authConfig, ...config };
    return toast.success(`${userId}님 환영합니다!`, finalConfig);
  }

  // 로그아웃 성공 toast
  static logoutSuccess(message?: string, config?: ToastConfig) {
    const finalConfig = { ...authConfig, ...config };
    const defaultMessage = '로그아웃이 완료되었습니다.';
    return toast.success(message || defaultMessage, finalConfig);
  }

  // 로그아웃 실패 toast
  static logoutError(message?: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    const defaultMessage = '로그아웃 중 오류가 발생했습니다.';
    return toast.error(message || defaultMessage, finalConfig);
  }

  // 장바구니 상품 추가 toast (이미지 포함)
  static basketAdded(productName: string, productImageUrl?: string, config?: ToastConfig) {
    const finalConfig = { ...successConfig, ...config };
    
    const toastContent = (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        minHeight: '40px',
        justifyContent: productImageUrl ? 'flex-start' : 'center',
        width: '100%'
      }}>
        {productImageUrl && (
          <img 
            src={productImageUrl} 
            alt={productName}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid rgba(255,255,255,0.2)',
              flexShrink: 0
            }}
            onError={(e) => {
              console.error("[ToastManager] 이미지 로딩 실패:", productImageUrl);
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => {
              console.log("[ToastManager] 이미지 로딩 성공:", productImageUrl);
            }}
          />
        )}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          flex: productImageUrl ? 1 : 'none',
          textAlign: productImageUrl ? 'left' : 'center'
        }}>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>
            상품이 추가되었습니다! 🛒
          </div>
        </div>
      </div>
    );
    
    return toast(toastContent, finalConfig);
  }

  // 테스트용 toast
  static test() {
    const testToastContent = (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        minHeight: '40px',
        justifyContent: 'flex-start',
        width: '100%'
      }}>
        <img 
          src="https://sitem.ssgcdn.com/00/12/84/item/1000549841200_i1_290.jpg" 
          alt="테스트 상품"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            objectFit: 'cover',
            border: '1px solid rgba(255,255,255,0.2)',
            flexShrink: 0
          }}
          onError={(e) => {
            console.error('[ToastManager] 테스트 이미지 로딩 실패');
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => {
            console.log('[ToastManager] 테스트 이미지 로딩 성공');
          }}
        />
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          flex: 1,
          textAlign: 'left'
        }}>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>
            상품이 추가되었습니다!
          </div>
        </div>
      </div>
    );
    
    return toast.success(testToastContent, successConfig);
  }
}

export default ToastManager; 