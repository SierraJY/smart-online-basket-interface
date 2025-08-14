'use client'

import Link from 'next/link'
import { useAuth } from '@/utils/hooks/useAuth'
import {
  Home, ShoppingBasket,
} from 'lucide-react'
import { useHasNewItems } from '@/store/useBasketStore'
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu } from 'lucide-react'
import CategoryModal from './modals/CategoryModal'

export default function Footer() {
  const { mounted } = useAuth();
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const hasNewItems = useHasNewItems()

  // 사용자 활동 감지 함수
  const resetInactivityTimer = useCallback(() => {
    // 기존 타이머가 있다면 클리어
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    
    // Footer가 보이는 상태일 때만 타이머 설정
    if (isVisible) {
      inactivityTimerRef.current = setTimeout(() => {
        setIsVisible(false)
      }, 5000) // 5초
    }
  }, [isVisible])

  // 사용자 활동 이벤트 리스너들 (터치/클릭 감지)
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'touchstart', 'click']
    
    const handleUserActivity = () => {
      // Footer가 숨겨져 있다면 보이게 하고 타이머 리셋
      if (!isVisible) {
        setIsVisible(true)
      }
      resetInactivityTimer()
    }

    // 각 이벤트에 리스너 추가
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true })
    })

    // 초기 타이머 시작
    resetInactivityTimer()

    // 클린업 함수
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity)
      })
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [isVisible, resetInactivityTimer]) // resetInactivityTimer 의존성 추가

  // 스크롤 감지 (아래로 스크롤 시 Footer 숨기기)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // 아래로 스크롤하고 250px 이상 스크롤된 경우 Footer 숨기기
      if (currentScrollY > lastScrollY && currentScrollY > 250) {
        setIsVisible(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.footer
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ 
              duration: 0.3, 
              ease: [0.25, 0.46, 0.45, 0.94] 
            }}
            className="
              fixed bottom-5 left-1/2 -translate-x-1/2 w-[55%] max-w-md
              rounded-full shadow-md px-7 py-5 flex flex-col items-center z-50
              bg-[var(--footer-background)]
              backdrop-blur-xs
              border border-[var(--footer-border)]
              backdrop-saturate-200
              text-[var(--foreground)]
            "
          >
            {/* 네비/아이콘 버튼들 */}
            <div className="flex flex-row justify-between items-center w-full">

              <motion.button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="hover:scale-110"
                  title="카테고리"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ 
                    duration: 0.2,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                >
                <Menu color="var(--foreground)" strokeWidth={1.5} />
              </motion.button>
              
              <Link href="/" className="hover:scale-110" title="홈">
                <Home size={22} color="var(--foreground)" strokeWidth={1.2} />
              </Link>

              <Link href="/baskets" className="hover:scale-110 relative" title="장바구니">
                <ShoppingBasket size={24} color="var(--sobi-green)" strokeWidth={1.8} />
                {/* 새로운 상품 알림 표시 */}
                {hasNewItems && (
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </Link>
              {/* {realLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="hover:scale-110 cursor-pointer"
                  title="로그아웃"
                >
                  <LogOut size={22} color="var(--foreground)" strokeWidth={1.5} />
                </button>
              ) : (
                <Link href="/login" className="hover:scale-110" title="로그인">
                  <CircleUserRound size={22} color="var(--foreground)" strokeWidth={1.5} />
                </Link>
              )} */}
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* 카테고리 모달 */}
      <AnimatePresence mode="wait">
        {isCategoryModalOpen && (
          <CategoryModal onClose={() => setIsCategoryModalOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
