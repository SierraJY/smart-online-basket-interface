'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SearchModal from '../modals/SearchModal'
import { PiMagnifyingGlassLight  } from "react-icons/pi";

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
      <motion.button
        onClick={openModal}
        className="w-10 h-10 flex items-center justify-center rounded-full shadow-sm bg-white/60 backdrop-blur-sm"
        whileHover={{ 
          scale: 1.1,
          boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
        }}
        whileTap={{ scale: 0.95 }}
      >
        <PiMagnifyingGlassLight  size={24} color="var(--foreground)" strokeWidth={1} />
      </motion.button>

      {/* 모달 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={handleBackdropClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* 배경 */}
            <motion.div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
            
            {/* 모달 본문 */}
            <motion.div
              ref={modalRef}
              className="relative z-10 w-full max-w-md"
              initial={{ 
                opacity: 0, 
                scale: 0.8,
                y: 20
              }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: 0
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8,
                y: 20
              }}
              transition={{ 
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              <SearchModal onClose={closeModal} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
