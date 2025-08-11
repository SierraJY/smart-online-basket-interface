import React from 'react';
import toast from 'react-hot-toast';
import Image from 'next/image';

// Toast 타입 정의
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Toast 위치 정의
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

// Toast 설정 인터페이스
interface ToastConfig {
  position?: ToastPosition;
  duration?: number;
  style?: React.CSSProperties;
  id?: string;
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

// 인증 관련 toast 설정
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

// 장바구니 관련 toast 설정
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

  // 찜 추가 toast
  static favoriteAdded(config?: ToastConfig) {
    const finalConfig = { ...favoriteConfig, ...config };
    return toast.success('찜 목록에 추가되었습니다', finalConfig);
  }

  // 찜 제거 toast
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

  // 입력 필수 toast
  static inputRequired(fieldName: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(`${fieldName}을(를) 입력해주세요`, finalConfig);
  }

  // 로그인 성공 toast
  static loginSuccess(userId: string, config?: ToastConfig) {
    const finalConfig = { ...authConfig, ...config };
    return toast.success(`${userId}님 환영합니다!`, finalConfig);
  }

  // 게스트 로그인 성공 toast
  static guestLoginSuccess(config?: ToastConfig) {
    const finalConfig = { ...authConfig, ...config };
    return toast.success('게스트로 로그인되었습니다!', finalConfig);
  }



  // 로그아웃 성공 toast
  static logoutSuccess(userId?: string, config?: ToastConfig) {
    const finalConfig = { ...authConfig, ...config };
    const defaultMessage = userId ? `${userId}님 다음에 또 뵈요!` : '로그아웃되었습니다';
    return toast(defaultMessage, finalConfig);
  }

  // 로그아웃 실패 toast
  static logoutError(message?: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    const defaultMessage = '로그아웃 중 오류가 발생했습니다';
    return toast.error(message || defaultMessage, finalConfig);
  }

  // 장바구니 사용 중 로그아웃 방지 toast
  static basketInUse(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('장바구니를 사용 중입니다. 먼저 결제를 완료하거나 연결을 해제해주세요.', finalConfig);
  }

  // 바구니 관련 toast들
  static basketActivationPending(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('장바구니 활성화가 진행 중입니다. 잠시 후 다시 시도해주세요.', finalConfig);
  }

  static basketAlreadyConnected(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.success('이미 연결되어 있습니다!', { ...finalConfig, duration: 2000 });
  }

  static basketReconnecting(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.loading('재연결 중...', { ...finalConfig, id: 'reconnect', duration: 5000 });
  }

  static basketConnectionFailed(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('연결에 실패했습니다. 다시 시도해주세요.', finalConfig);
  }

  static basketLoginRequired(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('로그인이 필요합니다.', finalConfig);
  }

  static basketEmpty(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('장바구니가 비어있습니다.', finalConfig);
  }

  static basketCheckoutProcessing(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.loading('결제 처리 중...', { ...finalConfig, id: 'checkout' });
  }

  static basketCheckoutSuccess(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.success('결제가 완료되었습니다!', { ...finalConfig, id: 'checkout' });
  }

  static basketCheckoutDatabaseError(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('결제 처리 중 데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', { ...finalConfig, id: 'checkout' });
  }

  static basketCheckoutFailed(errorMessage: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(`결제 실패: ${errorMessage}`, { ...finalConfig, id: 'checkout' });
  }

  static basketCheckoutNetworkError(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('결제 요청 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.', { ...finalConfig, id: 'checkout' });
  }

  static basketDisconnectPreparing(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast('연결 해제 기능은 준비 중입니다.', { ...finalConfig, duration: 3000 });
  }

  static basketDisconnectRequiresEmpty(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('연결 해제를 위해선 장바구니를 비워주세요', { ...finalConfig, duration: 3000 });
  }

  // 장바구니 취소 관련
  static basketCancelProcessing(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.loading('장바구니 연결을 해제하는 중...', { ...finalConfig, id: 'basket-cancel' });
  }

  static basketCancelSuccess(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.success('장바구니 연결이 해제되었습니다.', { ...finalConfig, id: 'basket-cancel' });
  }

  static basketCancelFailed(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(`장바구니 연결 해제 실패: ${message}`, { ...finalConfig, id: 'basket-cancel' });
  }

  static basketCancelNetworkError(config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error('연결 해제 요청 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.', { ...finalConfig, id: 'basket-cancel' });
  }

  // SSE 에러 관련 toast들
  static sseAuthError(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(`${message} 로그인 페이지로 이동하세요.`, { ...finalConfig, duration: 5000 });
  }

  static sseTimeoutError(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(message, { ...finalConfig, duration: 4000 });
  }

  static sseGeneralError(message: string, config?: ToastConfig) {
    const finalConfig = { ...defaultConfig, ...config };
    return toast.error(message, { ...finalConfig, duration: 3000 });
  }

  // 장바구니 상품 추가 toast (이미지 포함)
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
        <Image 
          src="https://sitem.ssgcdn.com/00/12/84/item/1000549841200_i1_290.jpg" 
          alt="테스트 상품"
          width={40}
          height={40}
          style={{
            borderRadius: '8px',
            objectFit: 'cover',
            border: '1px solid rgba(255,255,255,0.2)',
            flexShrink: 0
          }}
          onError={() => {
            console.error('[ToastManager] 테스트 이미지 로딩 실패');
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
            테스트 메시지
          </div>
        </div>
      </div>
    );
    
    return toast.success(testToastContent, successConfig);
  }
}

export default ToastManager; 