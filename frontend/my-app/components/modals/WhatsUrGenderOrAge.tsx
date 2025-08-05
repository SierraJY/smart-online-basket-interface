'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import ToastManager from '@/utils/toastManager'

interface WhatsUrGenderOrAgeProps {
  open: boolean
  gender: number
  age: number
  setGender: (g: number) => void
  setAge: (a: number) => void
  onClose: () => void
  onSubmit: () => void
}

export default function WhatsUrGenderOrAge({
  open,
  gender,
  age,
  setGender,
  setAge,
  onClose,
  onSubmit,
}: WhatsUrGenderOrAgeProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  
  // 선택안함 체크박스 상태
  const [genderSkip, setGenderSkip] = useState(false)
  const [ageSkip, setAgeSkip] = useState(false)

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

  // 체크박스 상태에 따라 값 설정
  useEffect(() => {
    if (genderSkip) {
      setGender(0)
    }
  }, [genderSkip, setGender])

  useEffect(() => {
    if (ageSkip) {
      setAge(0)
    }
  }, [ageSkip, setAge])

  // 폼 제출 처리
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 유효성 검사 - 나이만 체크 (성별은 선택안함 체크 안하면 무조건 선택됨)
    if (!ageSkip && age === 0) {
      ToastManager.inputRequired('나이')
      return
    }
    
    onSubmit()
  }

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

        {/* 헤더 */}
        <div className="text-center mb-6">
          <p className="text-lg font-semibold text-[var(--foreground)]">추가 정보 입력</p>
        </div>

        {/* 안내문구 */}
        <div className="mb-6 text-center">
          <div className="text-base font-bold mb-1">
            성별과 나이를 선택하면
          </div>
          <div className="font-semibold mb-1" style={{ color: 'var(--sobi-green)' }}>
            SOBI AI 추천 서비스
          </div>
          <div className="text-[15px] text-[var(--text-secondary)]">
            를 제공 받으실 수 있어요!
          </div>
        </div>

        {/* 선택폼 */}
        <form
          className="flex flex-col gap-5 items-center"
          onSubmit={handleSubmit}
        >
          {/* 성별 섹션 */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[var(--foreground)]">성별</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="genderSkip"
                  checked={genderSkip}
                  onChange={(e) => setGenderSkip(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-[var(--sobi-green)]"
                />
                <label htmlFor="genderSkip" className="text-xs text-[var(--text-secondary)]">
                  선택안함
                </label>
              </div>
            </div>
            <div
              className={`relative flex-shrink-0 select-none transition-all duration-300 ${
                genderSkip ? 'opacity-50' : ''
              }`}
              style={{
                borderRadius: '999px',
                background: genderSkip 
                  ? 'var(--modal-glass-bg,rgba(128,128,128,0.2))' 
                  : 'var(--modal-glass-bg,rgba(255,255,255,0.36))',
                border: '1.8px solid var(--modal-glass-border,rgba(85, 64, 64, 0.35))',
                boxShadow: '0 1.5px 10px 0 rgba(0,0,0,0.06)',
                backdropFilter: 'blur(9px)',
                WebkitBackdropFilter: 'blur(9px)',
                transition: 'background 0.4s, border 0.4s',
                position: 'relative',
                zIndex: 50
              }}
            >
                             <select
                 value={gender === 0 ? 1 : gender}
                 onChange={e => setGender(Number(e.target.value))}
                 disabled={genderSkip}
                 className={`w-full px-5 py-3 text-sm bg-transparent focus:outline-none appearance-none cursor-pointer transition-all ${
                   genderSkip ? 'cursor-not-allowed opacity-50' : ''
                 }`}
                 style={{
                   color: genderSkip ? 'var(--text-secondary)' : 'var(--foreground)',
                   border: 'none',
                   fontWeight: 500,
                   borderRadius: 99,
                   background: 'transparent',
                   zIndex: 20,
                   scrollbarWidth: 'none',
                   msOverflowStyle: 'none'
                 }}
               >
                 <option value={1}>남성</option>
                 <option value={2}>여성</option>
               </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* 나이 섹션 */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[var(--foreground)]">나이</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ageSkip"
                  checked={ageSkip}
                  onChange={(e) => setAgeSkip(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-[var(--sobi-green)]"
                />
                <label htmlFor="ageSkip" className="text-xs text-[var(--text-secondary)]">
                  선택안함
                </label>
              </div>
            </div>
            <div
              className={`relative flex-shrink-0 select-none transition-all duration-300 ${
                ageSkip ? 'opacity-50' : ''
              }`}
              style={{
                borderRadius: '999px',
                background: ageSkip 
                  ? 'var(--modal-glass-bg,rgba(128,128,128,0.2))' 
                  : 'var(--modal-glass-bg,rgba(255,255,255,0.36))',
                border: '1.8px solid var(--modal-glass-border,rgba(85, 64, 64, 0.35))',
                boxShadow: '0 1.5px 10px 0 rgba(0,0,0,0.06)',
                backdropFilter: 'blur(9px)',
                WebkitBackdropFilter: 'blur(9px)',
                transition: 'background 0.4s, border 0.4s',
                position: 'relative',
                zIndex: 50
              }}
            >
              <input
                type="number"
                value={age === 0 ? '' : age}
                onChange={e => {
                  const value = parseInt(e.target.value) || 0;
                  setAge(value);
                }}
                disabled={ageSkip}
                placeholder="20"
                min="1"
                max="120"
                className={`w-full px-5 py-3 text-sm bg-transparent focus:outline-none transition-all ${
                  ageSkip ? 'cursor-not-allowed opacity-50' : ''
                }`}
                style={{
                  color: ageSkip ? 'var(--text-secondary)' : 'var(--foreground)',
                  border: 'none',
                  fontWeight: 500,
                  borderRadius: 99,
                  background: 'transparent',
                  zIndex: 20
                }}
              />
              <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none transition-all ${
                ageSkip ? 'opacity-50' : ''
              }`} style={{ color: 'var(--text-secondary)' }}>
                세
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 rounded-xl text-base font-bold shadow-lg active:scale-95 transition-all"
            style={{ 
              backgroundColor: 'var(--sobi-green)',
              color: 'white'
            }}
          >
            회원가입 완료
          </button>
        </form>
      </div>
      {/* 부드러운 fadein 애니메이션 */}
      <style>{`
        .animate-fadein { animation: fadein .28s cubic-bezier(.2,1.6,.5,1) }
        @keyframes fadein { from { opacity:0; transform:scale(.97);} to { opacity:1; transform:scale(1);} }
      `}</style>
    </div>
  )
}
