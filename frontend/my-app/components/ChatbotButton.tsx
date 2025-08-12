'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import ChatbotModal from '@/components/modals/ChatbotModal'

export default function ChatbotButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  // ESC 키 처리
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
      {/* 챗봇 버튼 */}
      <motion.button
        onClick={openModal}
        className="fixed top-4 left-4 z-40 p-3 rounded-full shadow-lg"
        style={{
          backgroundColor: 'var(--sobi-green)',
          color: 'white'
        }}
        whileHover={{ 
          scale: 1.1,
          boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
        }}
        whileTap={{ scale: 0.95 }}
        aria-label="챗봇 열기"
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* 챗봇 모달 */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 px-4"
            onClick={handleBackdropClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* 배경 흐림 효과 */}
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
              <ChatbotModal 
                onClose={closeModal}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
