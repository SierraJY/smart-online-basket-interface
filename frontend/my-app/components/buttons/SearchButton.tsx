'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SearchModal from '../modals/SearchModal'
import { FaMagnifyingGlass } from "react-icons/fa6";

export default function SearchButton() {
  const [isOpen, setIsOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  // esc 키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 외부 클릭 처리
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      closeModal()
    }
  }

  return (
    <>
      {/* 돋보기 버튼 */}
        <motion.div
          layoutId="searchBox"
        >
          <button
            onClick={openModal}
            className="p-3 rounded-full shadow-sm bg-white/60 hover:scale-110 transition-all backdrop-blur-sm"
          >
            <FaMagnifyingGlass size={25} color='var(--foreground)' strokeWidth={1} />
          </button>
        </motion.div>

      {/* 모달 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={handleBackdropClick} // 💡 핵심
          >
            {/* 배경 */}
            <motion.div
              className="absolute inset-0 bg-black/10 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            
            {/* 모달 본문 */}
            <motion.div
              layoutId="searchBox"
              ref={modalRef} // 🔥 여기에 ref
              className="relative z-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 1.0, ease: [0.25, 0.8, 0.25, 1] }}
            >
              <SearchModal onClose={closeModal} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
