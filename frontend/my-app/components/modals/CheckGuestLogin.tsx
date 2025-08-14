'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface CheckGuestLoginProps {
  open: boolean
  onClose: () => void
  onGuestLogin: () => void
  onSignup: () => void
  guestLoginLoading?: boolean
}

export default function CheckGuestLogin({
  open,
  onClose,
  onGuestLogin,
  onSignup,
  guestLoginLoading = false,
}: CheckGuestLoginProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // ESC로 닫기
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[99] bg-black/50 animate-fadein">
      <div
        ref={modalRef}
        className="w-full max-w-xs sm:max-w-sm px-6 py-8 rounded-3xl shadow-2xl relative"
        style={{
          background: 'var(--background)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
          color: 'var(--foreground)',
          transition: 'background 0.6s, color 0.6s, border 0.6s',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={onClose}
          type="button"
          aria-label="닫기"
        >
          <X size={20} />
        </button>

        {/* 안내문구 */}
        <div className="mb-6 text-center">
          <div className="text-base font-bold mb-4">
            게스트 로그인 안내
          </div>
          <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
            게스트로 로그인 시 <span style={{ color: 'var(--sobi-green)', fontWeight: 'bold' }}>찜 기능</span>과{' '}
            <span style={{ color: 'var(--sobi-green)', fontWeight: 'bold' }}>취향 기반 AI 서비스</span>가 제한됩니다.
          </div>
          <div className="text-sm text-[var(--text-secondary)] mt-2">
            게스트로 로그인 하시겠습니까?
          </div>
        </div>

        {/* 버튼 섹션 */}
        <div className="flex flex-col gap-3">
          {/* 게스트 로그인 버튼 */}
          <button
            type="button"
            onClick={onGuestLogin}
            className="w-full rounded-xl py-3 text-base font-bold transition-all shadow-lg active:scale-95"
            style={{ 
              backgroundColor: 'var(--guest-orange)',
              color: 'white'
            }}
            disabled={guestLoginLoading}
          >
            {guestLoginLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
                게스트 로그인 중...
              </div>
            ) : "게스트로 시작하기"}
          </button>

          {/* 회원가입 버튼 */}
          <button
            type="button"
            onClick={onSignup}
            className="w-full rounded-xl py-3 text-base font-bold transition-all shadow-lg active:scale-95"
            style={{ 
              backgroundColor: 'var(--sobi-green)',
              color: 'white'
            }}
          >
            회원가입
          </button>
        </div>
      </div>
      
      {/* 부드러운 fadein 애니메이션 */}
      <style>{`
        .animate-fadein { animation: fadein .28s cubic-bezier(.2,1.6,.5,1) }
        @keyframes fadein { from { opacity:0; transform:scale(.97);} to { opacity:1; transform:scale(1);} }
      `}</style>
    </div>
  )
}
