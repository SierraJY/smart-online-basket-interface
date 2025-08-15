'use client'

import { useState, useEffect, useRef } from "react"
import { Package, PackageOpen } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import Image from 'next/image'
import ProfileButton from './ProfileButton'
import SearchButton from './SearchButton'
import DarkModeButton from './DarkModeButton'
import LogoutButton from './LogoutButton'
import GuestLogoutModal from '@/components/modals/GuestLogoutModal'
import { useAuth } from '@/utils/hooks/useAuth'
import ToastManager from '@/utils/toastManager'

export default function MenuButton() {
  const [open, setOpen] = useState(false)
  const [showGuestLogoutModal, setShowGuestLogoutModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, isGuestUser, logout } = useAuth()

  // 찜 목록 버튼 클릭 핸들러
  const handleFavoriteClick = () => {
    if (isGuestUser) {
      // 게스트 사용자는 찜 기능 사용 불가
      ToastManager.guestFavoriteRestricted()
      return
    }
    if (isLoggedIn) {
      router.push('/favorite')
    } else {
      router.push('/login')
    }
    setOpen(false)
  }

  // 게스트 로그아웃 모달 표시
  const handleShowGuestModal = () => {
    setShowGuestLogoutModal(true)
    setOpen(false) // 메뉴 닫기
  }

  // 모달에서 로그아웃 처리
  const handleModalLogout = async () => {
    try {
      await logout()
      ToastManager.logoutSuccess('게스트') // 명시적으로 사용자명 전달
      setShowGuestLogoutModal(false)
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 오류:', error)
      ToastManager.logoutError()
    }
  }

  // 모달에서 회원가입 처리
  const handleModalSignup = async () => {
    try {
      await logout()
      setShowGuestLogoutModal(false)
      router.push('/signup')
    } catch (error) {
      console.error('로그아웃 오류:', error)
      ToastManager.logoutError()
    }
  }



  // ESC로 닫기
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  // 바깥 클릭시 닫기
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  // 페이지 이동시 닫기
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div ref={menuRef}>
      {/* FAB 버튼들 */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="logout"
              initial={{ opacity: 0, translateY: 32 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 32 }}
              transition={{ delay: 0.125, duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
              className="mb-3"
            >
              <LogoutButton 
                className="w-10 h-10 flex items-center justify-center rounded-full shadow-sm bg-white/60 backdrop-blur-sm"
                iconSize={24}
                showTooltip={true}
                onShowGuestModal={handleShowGuestModal}
              />
            </motion.div>

            <motion.div
              key="profile"
              initial={{ opacity: 0, translateY: 32 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 32 }}
              transition={{ delay: 0.125, duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
              className="mb-3"
            >
              <ProfileButton inline />
            </motion.div>

            <motion.div
              key="search"
              initial={{ opacity: 0, translateY: 32 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 32 }}
              transition={{ delay: 0.125, duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
              className="mb-3"
            >
              <SearchButton />
            </motion.div>

            <motion.div
              key="favorite"
              initial={{ opacity: 0, translateY: 32 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 32 }}
              transition={{ delay: 0.125, duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
              className="mb-3"
            >
              <motion.button
                onClick={handleFavoriteClick}
                className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm bg-white/60 backdrop-blur-sm ${isGuestUser ? 'opacity-30' : ''}`}
                whileHover={isGuestUser ? {} : { 
                  scale: 1.1,
                  boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
                }}
                whileTap={isGuestUser ? {} : { scale: 0.95 }}
                aria-label={isGuestUser ? "게스트는 찜 기능을 사용할 수 없습니다" : (isLoggedIn ? "찜 목록" : "로그인하고 찜 목록 보기")}
                title={isGuestUser ? "게스트는 찜 기능을 사용할 수 없습니다" : (isLoggedIn ? "찜 목록" : "로그인이 필요합니다")}
              >
                <Image
                  src="/icon/favorite.png"
                  alt="찜 목록"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </motion.button>
            </motion.div>

            <motion.div
              key="darkmode"
              initial={{ opacity: 0, translateY: 32 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 32 }}
              transition={{ delay: 0.15, duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
              className="mb-3"
            >
              <DarkModeButton />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 메뉴 메인버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          w-10 h-10 flex items-center justify-center rounded-full
          z-50 hover:scale-110 transition-all
        `}
        style={{
          backgroundColor: 'var(--background)',
          border: '1px solid var(--footer-border)',
          backdropFilter: 'blur(10px) saturate(140%)'
        }}
        aria-label="Menu"
      >
        {open ? (
          <PackageOpen size={28} color="var(--foreground)" strokeWidth={1} />
        ) : (
          <Package size={28} color="var(--foreground)" strokeWidth={1} />
        )}
      </button>

      {/* 게스트 로그아웃 모달 */}
      <AnimatePresence>
        {showGuestLogoutModal && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowGuestLogoutModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <GuestLogoutModal 
                onClose={() => setShowGuestLogoutModal(false)} 
                onLogout={handleModalLogout}
                onSignup={handleModalSignup}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
