'use client'

import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface GuestLogoutModalProps {
  onClose: () => void
  onLogout: () => void
  onSignup?: () => void
}

export default function GuestLogoutModal({ onClose, onLogout, onSignup }: GuestLogoutModalProps) {
  const router = useRouter()

  const handleSignupClick = () => {
    if (onSignup) {
      onSignup()
    } else {
      // 기본 동작: 로그아웃 후 회원가입 페이지로 이동
      onLogout()
      router.push('/signup')
    }
  }

  return (
    <div 
      className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col"
      style={{
        backgroundColor: 'var(--background)',
        border: '1px solid var(--border)',
        maxHeight: '90vh'
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full">
            <span className="text-white text-lg">👋</span>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">이용해주셔서 감사합니다!</h3>
            <p className="text-xs text-[var(--text-secondary)]">더 나은 서비스를 위해</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full transition-colors"
        >
          <X size={20} className="text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* 내용 */}
      <div className="px-4 pb-4">
        <div className="text-center mb-6">
          <p className="text-[var(--foreground)] leading-relaxed">
            SOBI와 함께 편리한 쇼핑이 되셨나요?<br />
            회원가입을 하시면 더욱 뛰어난<br /> 취향 분석 SOBI AI와 찜 기능을 이용하실 수 있어요!
          </p>
        </div>

        {/* 버튼 영역 */}
        <div className="space-y-3">
          <motion.button
            onClick={handleSignupClick}
            className="w-full p-3 rounded-xl font-medium transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--sobi-green)',
              color: 'white'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            로그아웃 후 회원가입 하기
          </motion.button>
          
          <motion.button
            onClick={onLogout}
            className="w-full p-3 rounded-xl font-medium transition-all duration-200"
            style={{ 
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            로그아웃 후 닫기
          </motion.button>
        </div>
      </div>
    </div>
  )
}
