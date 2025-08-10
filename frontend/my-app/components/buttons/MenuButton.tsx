'use client'

import { useState, useEffect, useRef } from "react"
import { Package, PackageOpen } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import ProfileButton from './ProfileButton'
import SearchButton from './SearchButton'
import DarkModeButton from './DarkModeButton'

export default function MenuButton() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()



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
              key="qrcode"
              initial={{ opacity: 0, translateY: 32 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 32 }}
              transition={{ duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
              className="mb-3"
            >
              <ProfileButton inline />
            </motion.div>

            <motion.div
              key="search"
              initial={{ opacity: 0, translateY: 32 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 32 }}
              transition={{ delay: 0.1, duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
              className="mb-3"
            >
              <SearchButton />
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
