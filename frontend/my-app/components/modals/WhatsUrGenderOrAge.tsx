'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

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
    <div className="fixed inset-0 flex items-center justify-center z-[99] bg-black/40 backdrop-blur-[2px] animate-fadein">
      <div
        ref={modalRef}
        className="w-full max-w-xs sm:max-w-sm px-5 py-8 rounded-3xl shadow-2xl relative"
        style={{
          background: 'var(--search-modal-bg, rgba(255,255,255,0.85))',
          border: '1.5px solid var(--search-modal-border, rgba(255,255,255,0.18))',
          boxShadow: '0 8px 32px 0 rgba(189, 189, 189, 0.33)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: 'var(--foreground)',
          transition: 'background 0.6s, color 0.6s, border 0.6s',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-full"
          onClick={onClose}
          type="button"
          aria-label="닫기"
        >
          <X size={26} />
        </button>

        {/* 안내문구 */}
        <div className="mb-6 text-center">
          <div className="text-base font-bold mb-1">
            성별과 나이를 선택하면
          </div>
          <div className="text-green-700 dark:text-green-400 font-semibold mb-1">
            보다 뛰어난 AI 추천 서비스
          </div>
          <div className="text-[15px] text-gray-600 dark:text-gray-300">
            를 제공 받으실 수 있습니다!
          </div>
        </div>

        {/* 선택폼 */}
        <form
          className="flex flex-col gap-4 items-center"
          onSubmit={e => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <div className="w-full">
            <label className="block mb-1 text-sm font-medium">성별</label>
            <select
              value={gender}
              onChange={e => setGender(Number(e.target.value))}
              className="w-full rounded-lg border px-4 py-2 text-[15px] bg-[var(--input-background)] focus:outline-none"
            >
              <option value={0}>선택안함</option>
              <option value={1}>남자</option>
              <option value={2}>여자</option>
            </select>
          </div>
          <div className="w-full">
            <label className="block mb-1 text-sm font-medium">나이</label>
            <select
              value={age}
              onChange={e => setAge(Number(e.target.value))}
              className="w-full rounded-lg border px-4 py-2 text-[15px] bg-[var(--input-background)] focus:outline-none"
            >
              <option value={0}>선택안함</option>
              {[...Array(100)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}세
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full mt-2 py-3 rounded-xl text-base font-bold bg-[var(--foreground)] text-[var(--background)] shadow active:scale-95 transition"
          >
            선택 완료하고 회원가입
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
