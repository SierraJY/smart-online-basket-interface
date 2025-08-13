'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { FiUserX } from "react-icons/fi"

interface WithdrawalModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

export default function WithdrawalModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}: WithdrawalModalProps) {
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

        {/* 아이콘 */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center">
            <FiUserX size={32} />
          </div>
        </div>

        {/* 안내문구 */}
        <div className="mb-6 text-center">
          <div className="text-base font-bold mb-4">
            회원 탈퇴 확인
          </div>
          <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
            정말로 탈퇴하시겠습니까?
          </div>
          <div className="text-sm mt-2">
            <span className="text-red-500 font-semibold">탈퇴 시 구매내역이 삭제되며 학습된 AI 추천 서비스를<br /> 더 이상 제공받을 수 없습니다.</span>
          </div>
        </div>

        {/* 버튼 섹션 */}
        <div className="flex flex-col gap-3">
          {/* 탈퇴하기 버튼 */}
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-xl py-3 text-base font-bold transition-all shadow-lg active:scale-95"
            style={{ 
                backgroundColor: 'var(--input-background)',
                color: 'var(--foreground)',
                border: '1px solid var(--input-border)'
            }}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                탈퇴 처리 중...
              </div>
            ) : "탈퇴하기"}
          </button>

          {/* 취소 버튼 */}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-3 text-base font-bold transition-all shadow-lg active:scale-95"
            style={{ 
              backgroundColor: 'var(--sobi-green)',
              color: 'var(--input-background)',
              border: '1px solid var(--input-border)'
            }}
          >
            취소
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
