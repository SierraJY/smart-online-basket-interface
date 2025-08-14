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
import { useAuth } from '@/utils/hooks/useAuth'

export default function MenuButton() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn } = useAuth()

  // 찜 목록 버튼 클릭 핸들러
  const handleFavoriteClick = () => {
    if (isLoggedIn) {
      router.push('/favorite')
    } else {
      router.push('/login')
    }
    setOpen(false)
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
              transition={{ duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
              className="mb-3"
            >
              <LogoutButton 
                className="w-10 h-10 flex items-center justify-center rounded-full shadow-sm bg-white/60 backdrop-blur-sm"
                iconSize={24}
                showTooltip={true}
              />
            </motion.div>

            <motion.div
              key="qrcode"
              initial={{ opacity: 0, translateY: 32 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 32 }}
              transition={{ delay: 0.1, duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
              className="mb-3"
            >
              <ProfileButton inline />
            </motion.div>

            <motion.div
              key="search"
              initial={{ opacity: 0, translateY: 32 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 32 }}
              transition={{ delay: 0.1125, duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
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
                className="w-10 h-10 flex items-center justify-center rounded-full shadow-sm bg-white/60 backdrop-blur-sm"
                whileHover={{ 
                  scale: 1.1,
                  boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
                }}
                whileTap={{ scale: 0.95 }}
                aria-label={isLoggedIn ? "찜 목록" : "로그인하고 찜 목록 보기"}
                title={isLoggedIn ? "찜 목록" : "로그인이 필요합니다"}
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
    </div>
  )
}
