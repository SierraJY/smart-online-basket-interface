import React from 'react';
import toast from 'react-hot-toast';
import Image from 'next/image';

/**
 * Toast 타입 정의
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast 위치 정의
 */
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

/**
 * Toast 설정 인터페이스
 */
interface ToastConfig {
  position?: ToastPosition;
  duration?: number;
  style?: React.CSSProperties;
  id?: string;
}

/**
 * ========================================
 * Toast 설정 객체들
 * ========================================
 */

/**
 * 기본 toast 설정
 */
const defaultConfig: ToastConfig = {
  position: 'top-center',
  duration: 3000,
  style: {
    background: 'var(--footer-background)',
    color: 'var(--foreground)',
    border: '1px solid var(--footer-border)',
  },
};

/**
 * 성공 메시지용 toast 설정
 */
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

/**
 * 찜하기 관련 toast 설정
 */
const favoriteConfig: ToastConfig = {
  position: 'top-center',
  duration: 2000,
  style: {
    background: 'var(--sobi-green)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    padding: '10px 16px',
  },
};

/**
 * 인증(로그인/로그아웃) 관련 toast 설정
 */
const authConfig: ToastConfig = {
  position: 'top-center',
  duration: 2000,
  style: {
    background: '#ffffff',
    color: '#333333',
    fontSize: '14px',
    fontWeight: '500',
    padding: '10px 16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
};

/**
 * 장바구니 관련 toast 설정
 */
const basketConfig: ToastConfig = {
  position: 'top-center',
  duration: 2000,
  style: {
    background: 'var(--sobi-green)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    padding: '6px 10px',
    borderRadius: '100px',
    boxShadow: '0 4px 12px rgba(66, 184, 131, 0.3)',
  },
};

/**
 * ========================================
 * Toast 관리자 클래스
 * ========================================
 */
class ToastManager {
  
  /**
   * ========================================
   * 기본 Toast 메서드들
   * ========================================
   */
  
  /**
   * 기본 toast 메시지 표시
   */
  static show(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast(message, finalConfig);
  }

  /**
   * 성공 toast 메시지 표시
   */
  static success(message: string, config?: ToastConfig) {
    const finalConfig = { ...successConfig, ...config };
    return toast.success(message, finalConfig);
  }

  /**
   * 에러 toast 메시지 표시
   */
  static error(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(message, finalConfig);
  }

  /**
   * 입력값 필수 에러 toast
   */
  static inputRequired(fieldName: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(`${fieldName}을(를) 입력해주세요`, finalConfig);
  }

  /**
   * ========================================
   * 찜하기 관련 Toast 메서드들
   * ========================================
   */

  /**
   * 찜하기 일반 메시지 toast
   */
  static favorite(message: string, config?: ToastConfig) {
    const finalConfig = { ...favoriteConfig, ...config };
    return toast.success(message, finalConfig);
  }

  /**
   * 찜 목록에 추가 완료 toast
   */
  static favoriteAdded(config?: ToastConfig) {
    const finalConfig = { ...favoriteConfig, ...config };
    return toast.success('찜 목록에 추가되었습니다', finalConfig);
  }

  /**
   * 찜 목록에서 제거 완료 toast
   */
  static favoriteRemoved(config?: ToastConfig) {
    const finalConfig = { 
      ...favoriteConfig, 
      ...config,
      style: {
        ...favoriteConfig.style,
        ...config?.style,
        animation: 'shake-intense 0.5s ease-in-out'
      }
    };
    return toast('찜 목록에서 제거되었습니다', finalConfig);
  }

  /**
   * ========================================
   * 인증(로그인/로그아웃) 관련 Toast 메서드들
   * ========================================
   */

  /**
   * 로그인 성공 toast
   */
  static loginSuccess(userId: string, config?: ToastConfig) {
    const finalConfig = { ...authConfig, ...config };
    return toast.success(`${userId}님 환영합니다!`, finalConfig);
  }

  /**
   * 게스트 로그인 성공 toast
   */
  static guestLoginSuccess(config?: ToastConfig) {
    const finalConfig = { ...authConfig, ...config };
    return toast.success('게스트로 로그인되었습니다!', finalConfig);
  }

  /**
   * 로그아웃 성공 toast
   */
  static logoutSuccess(userId?: string, config?: ToastConfig) {
    const finalConfig = { ...authConfig, ...config };
    const defaultMessage = userId ? `${userId}님 다음에 또 뵈요!` : '로그아웃되었습니다';
    return toast(defaultMessage, finalConfig);
  }

  /**
   * 로그아웃 실패 toast
   */
  static logoutError(message?: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    const defaultMessage = '로그아웃 중 오류가 발생했습니다';
    return toast.error(message || defaultMessage, finalConfig);
  }

  /**
   * 장바구니 사용 중 로그아웃 방지 toast
   */
  static basketInUse(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('장바구니를 사용 중입니다. 먼저 결제를 완료하거나 연결을 해제해주세요.', finalConfig);
  }

  /**
   * ========================================
   * 장바구니 연결/상태 관련 Toast 메서드들
   * ========================================
   */

  /**
   * 장바구니 활성화 진행 중 toast
   */
  static basketActivationPending(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('장바구니 활성화가 진행 중입니다. 잠시 후 다시 시도해주세요.', finalConfig);
  }

  /**
   * 장바구니 이미 연결됨 toast
   */
  static basketAlreadyConnected(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.success('이미 연결되어 있습니다!', { ...finalConfig, duration: 2000 });
  }

  /**
   * 장바구니 재연결 중 toast
   */
  static basketReconnecting(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.loading('재연결 중...', { ...finalConfig, id: 'reconnect', duration: 5000 });
  }

  /**
   * 장바구니 연결 실패 toast
   */
  static basketConnectionFailed(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('연결에 실패했습니다. 다시 시도해주세요.', finalConfig);
  }

  /**
   * 장바구니 사용 시 로그인 필요 toast
   */
  static basketLoginRequired(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('로그인이 필요합니다.', finalConfig);
  }

  /**
   * 장바구니 비어있음 toast
   */
  static basketEmpty(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('장바구니가 비어있습니다.', finalConfig);
  }

  /**
   * ========================================
   * 장바구니 결제 관련 Toast 메서드들
   * ========================================
   */

  /**
   * 결제 처리 중 toast
   */
  static basketCheckoutProcessing(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.loading('결제 처리 중...', { ...finalConfig, id: 'checkout' });
  }

  /**
   * 결제 완료 성공 toast
   */
  static basketCheckoutSuccess(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.success('결제가 완료되었습니다!', { ...finalConfig, id: 'checkout' });
  }

  /**
   * 결제 중 데이터베이스 오류 toast
   */
  static basketCheckoutDatabaseError(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('결제 처리 중 데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', { ...finalConfig, id: 'checkout' });
  }

  /**
   * 결제 실패 toast
   */
  static basketCheckoutFailed(errorMessage: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(`결제 실패: ${errorMessage}`, { ...finalConfig, id: 'checkout' });
  }

  /**
   * 결제 네트워크 오류 toast
   */
  static basketCheckoutNetworkError(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('결제 요청 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.', { ...finalConfig, id: 'checkout' });
  }

  /**
   * ========================================
   * 장바구니 연결 해제 관련 Toast 메서드들
   * ========================================
   */

  /**
   * 연결 해제 기능 준비 중 toast
   */
  static basketDisconnectPreparing(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast('연결 해제 기능은 준비 중입니다.', { ...finalConfig, duration: 3000 });
  }

  /**
   * 연결 해제 시 장바구니 비우기 필요 toast
   */
  static basketDisconnectRequiresEmpty(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('연결 해제를 위해선 장바구니를 비워주세요', { ...finalConfig, duration: 3000 });
  }

  /**
   * 장바구니 연결 해제 처리 중 toast
   */
  static basketCancelProcessing(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.loading('장바구니 연결을 해제하는 중...', { ...finalConfig, id: 'basket-cancel' });
  }

  /**
   * 장바구니 연결 해제 성공 toast
   */
  static basketCancelSuccess(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.success('장바구니 연결이 해제되었습니다.', { ...finalConfig, id: 'basket-cancel' });
  }

  /**
   * 장바구니 연결 해제 실패 toast
   */
  static basketCancelFailed(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(`장바구니 연결 해제 실패: ${message}`, { ...finalConfig, id: 'basket-cancel' });
  }

  /**
   * 장바구니 연결 해제 네트워크 오류 toast
   */
  static basketCancelNetworkError(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('연결 해제 요청 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.', { ...finalConfig, id: 'basket-cancel' });
  }

  /**
   * ========================================
   * SSE(Server-Sent Events) 에러 관련 Toast 메서드들
   * ========================================
   */

  /**
   * SSE 인증 오류 toast
   */
  static sseAuthError(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(`${message} 로그인 페이지로 이동하세요.`, { ...finalConfig, duration: 5000 });
  }

  /**
   * SSE 타임아웃 오류 toast
   */
  static sseTimeoutError(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(message, { ...finalConfig, duration: 4000 });
  }

  /**
   * SSE 일반 오류 toast
   */
  static sseGeneralError(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(message, { ...finalConfig, duration: 3000 });
  }

  /**
   * ========================================
   * 장바구니 상품 추가 관련 Toast 메서드들
   * ========================================
   */

  /**
   * 장바구니에 상품 추가 완료 toast (상품 이미지 포함)
   */
  static basketAdded(productName: string, productImageUrl?: string, config?: ToastConfig) {
    const finalConfig = { ...basketConfig, ...config };
    
    const toastContent = (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        minHeight: '40px',
        justifyContent: 'flex-start',
        width: '100%'
      }}>
        <Image 
          src={productImageUrl || '/placeholder-product.png'} 
          alt={productName}
          width={36}
          height={36}
          style={{
            borderRadius: '6px',
            objectFit: 'cover',
            border: '1px solid rgba(255,255,255,0.2)',
            flexShrink: 0
          }}
          onError={() => {
            console.error("[ToastManager] 이미지 로딩 실패:", productImageUrl);
          }}
          onLoad={() => {
            console.log("[ToastManager] 이미지 로딩 성공:", productImageUrl);
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
            장바구니에 추가되었습니다
          </div>
        </div>
      </div>
    );
    
    return toast.success(toastContent, finalConfig);
  }


}

/**
 * ========================================
 * Export
 * ========================================
 */
export default ToastManager; 