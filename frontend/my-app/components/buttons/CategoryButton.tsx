'use client'

import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RxHamburgerMenu } from "react-icons/rx";
import CategoryModal from '../modals/CategoryModal'

export default function CategoryButton() {
  const [isOpen, setIsOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 처리 (SearchButton과 동일)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsOpen(false)
    }
  }

  return (
    <>
        <motion.div layoutId="categoryBox">
          <button
            onClick={() => setIsOpen(true)}
            className="p-3 rounded-full shadow-sm bg-white/60 hover:scale-110 transition-all backdrop-blur-sm"
          >
            <RxHamburgerMenu size={25} color='var(--foreground)' strokeWidth={1} />
          </button>
        </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={handleBackdropClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
              layoutId="categoryBox"
              ref={modalRef}
              className="relative z-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 1.0, ease: [0.25, 0.8, 0.25, 1] }}
            >
              <CategoryModal onClose={() => setIsOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
