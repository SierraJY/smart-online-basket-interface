'use client'

import { LogOut } from 'lucide-react'
import { useAuth } from '@/utils/hooks/useAuth'
import { useBasketId, useActivatedBasketId } from '@/store/useBasketStore'
import ToastManager from '@/utils/toastManager'

interface LogoutButtonProps {
  /** 버튼의 클래스명 (선택사항) */
  className?: string
  /** 아이콘 크기 (기본값: 18) */
  iconSize?: number
  /** 툴팁 표시 여부 (기본값: true) */
  showTooltip?: boolean
  /** 로그아웃 성공 후 실행할 콜백 함수 */
  onLogoutSuccess?: () => void
  /** 로그아웃 실패 시 실행할 콜백 함수 */
  onLogoutError?: (error: any) => void
}

export default function LogoutButton({
  className = "absolute top-4 right-4 p-2 rounded-full transition-colors",
  iconSize = 18,
  showTooltip = true,
  onLogoutSuccess,
  onLogoutError
}: LogoutButtonProps) {
  const { logout, userId } = useAuth()
  
  // 바구니 상태 확인
  const basketId = useBasketId()
  const activatedBasketId = useActivatedBasketId()
  
  // 바구니 사용 중인지 확인하는 함수
  const isBasketInUse = () => {
    return !!(basketId && activatedBasketId)
  }

  // 로그아웃 처리
  const handleLogout = async () => {
    // 바구니 사용 중인지 확인
    if (isBasketInUse()) {
      ToastManager.basketInUse()
      return
    }
    
    try {
      await logout()
      ToastManager.logoutSuccess(userId || undefined)
      onLogoutSuccess?.()
    } catch (error) {
      console.error('로그아웃 오류:', error)
      ToastManager.logoutError()
      onLogoutError?.(error)
    }
  }

  // 동적 클래스명 생성
  const buttonClassName = `${className} ${
    isBasketInUse() 
      ? 'opacity-30' 
      : 'hover:bg-[var(--footer-border)]'
  }`

  // 툴팁 메시지
  const tooltipMessage = isBasketInUse() 
    ? `장바구니 사용 중 (번호: ${basketId}) - 로그아웃 불가`
    : '로그아웃'

  return (
    <button 
      onClick={handleLogout}
      className={buttonClassName}
      title={showTooltip ? tooltipMessage : undefined}
      aria-label={tooltipMessage}
    >
      <LogOut 
        size={iconSize} 
        strokeWidth={1}
        className={
          isBasketInUse() 
            ? 'opacity-30' 
            : 'text-[var(--foreground)]'
        } 
      />
    </button>
  )
}