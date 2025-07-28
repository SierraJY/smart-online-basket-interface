'use client'

import { useState, useEffect, useRef } from "react"
import { BiCategory } from "react-icons/bi";
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"

import QrButton from './QrButton'
import CategoryButton from './CategoryButton'
import SearchButton from './SearchButton'
import DarkModeButton from './DarkModeButton'

export default function MenuButton() {
  const [open, setOpen] = useState(false)
  const [isDark, setIsDark] = useState(false) // 테마는 읽기
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // 다크모드 상태 동기화 (읽기만, setTheme 없음)
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

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
    <div ref={menuRef} className="fixed right-5 bottom-40 flex flex-col items-center z-50 select-none">
      {/* FAB 버튼들 */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="basket"
              initial={{ opacity: 0, translateY: 32 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 32 }}
              transition={{ duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
              className="mb-3"
            >
              <QrButton />
            </motion.div>
            <motion.div
              key="category"
              initial={{ opacity: 0, translateY: 32 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 32 }}
              transition={{ delay: 0.05, duration: 0.26, ease: [0.45, 0.01, 0.51, 1.1] }}
              className="mb-3"
            >
              <CategoryButton />
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
          w-14 h-14 flex items-center justify-center rounded-full
          shadow-2xl bg-[var(--toggle-bg)] z-50
          hover:scale-110 transition-all
        `}
        aria-label="Menu"
      >
        <BiCategory size={32} color={isDark ? "#fff" : "#222"} />
      </button>
    </div>
  )
}
