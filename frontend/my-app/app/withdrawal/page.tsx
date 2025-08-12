'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FiUserX } from "react-icons/fi"

export default function WithdrawalPage() {
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState(false)

  // 페이지 접근 권한 확인 및 로컬 스토리지 정리
  useEffect(() => {
    const withdrawalAccess = sessionStorage.getItem('withdrawalAccess')
    
    if (withdrawalAccess === 'true') {
      // 접근 권한이 있는 경우
      setHasAccess(true)
      // 접근 권한 제거 (일회성)
      sessionStorage.removeItem('withdrawalAccess')
      // 로컬 스토리지 정리 (탈퇴 완료 상태)
      localStorage.clear()
    } else {
      // 접근 권한이 없는 경우 홈으로 리다이렉트
      router.replace('/')
    }
  }, [router])

  // 권한 확인 중에는 로딩 표시
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" 
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">확인 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-15 background-paper"
      style={{
        backgroundColor: 'var(--background)',
      }}
    >
      <div className="max-w-md mx-auto px-4 py-6">
        {/* 메인 컨텐츠 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-16"
        >
          {/* 아이콘 */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800/30 rounded-full flex items-center justify-center">
              <FiUserX size={40} className="opacity-50" />
            </div>
          </div>

          {/* 제목 */}
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">
            회원 탈퇴 완료
          </h1>

          {/* 안내 메시지 */}
          <div className="text-[var(--text-secondary)] mb-8 leading-relaxed">
            <p className="mb-4">
              그동안 SOBI를 이용해 주셔서 진심으로 감사합니다.
            </p>
            <p className="mb-4">
              고객님의 모든 정보가 안전하게 삭제되었습니다.
            </p>
            <p className="text-sm opacity-75">
              언제든지 다시 찾아주시길 기다리겠습니다.
            </p>
          </div>

          {/* 홈으로 버튼 */}
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3 rounded-xl font-semibold transition-all shadow-lg"
              style={{ 
                backgroundColor: 'var(--sobi-green)',
                color: 'white'
              }}
            >
              홈으로
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
