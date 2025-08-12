'use client'

import { useState, useRef, useEffect } from 'react'
import { RiRobot3Line } from "react-icons/ri"
import { AnimatePresence, motion } from 'framer-motion'
import ChatbotModal from '@/components/modals/ChatbotModal'

interface ChatbotButtonProps {
  inline?: boolean; // true면 절대 위치 고정 없이 인라인으로 렌더링
}

export default function ChatbotButton({ inline = false }: ChatbotButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  // 배경 스크롤 방지
  useEffect(() => {
    if (isModalOpen) {
      // 현재 스크롤 위치 저장
      const scrollY = window.scrollY
      
      // 모달 열릴 때 스크롤 방지
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // 모달 닫힐 때 스크롤 복원
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
    
    // 모달이 열려있지 않을 때는 빈 cleanup 함수 반환
    return () => {}
  }, [isModalOpen])

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
      {inline ? (
        <motion.button
          onClick={openModal}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200"
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
          title="SOBI 챗봇"
        >
          <RiRobot3Line size={22} />
        </motion.button>
      ) : (
        <div className="absolute left-5">
          <motion.button
            onClick={openModal}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200"
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
            title="SOBI 챗봇"
          >
            <RiRobot3Line size={22} />
          </motion.button>
        </div>
      )}

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
              transition={{ 
                duration: 0.2,
                ease: "easeOut"
              }}
            />
            
            {/* 모달 본문 */}
            <motion.div
              ref={modalRef}
              className="relative z-10 w-full max-w-md"
              initial={{ 
                opacity: 0, 
                scale: 0.9,
                y: 30
              }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: 0
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.9,
                y: 30
              }}
              transition={{ 
                duration: 0.3,
                ease: [0.34, 1.56, 0.64, 1],
                type: "spring",
                stiffness: 300,
                damping: 30
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
