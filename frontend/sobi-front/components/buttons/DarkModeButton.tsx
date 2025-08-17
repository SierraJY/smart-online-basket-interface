'use client'

import { useEffect, useState } from 'react'
import { Moon, SunMedium } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function DarkModeButton() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const pathname = usePathname()

  // AI 페이지와 장바구니 페이지에서 다크모드 버튼 비활성화
  const isDisabled = pathname === '/ai' || pathname === '/baskets'

  // 최초 마운트 시 localStorage에서 테마 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (stored === 'dark') {
        setTheme('dark')
        document.documentElement.classList.add('dark')
      } else {
        setTheme('light')
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  // theme 변경 시 html 클래스 적용
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [theme])

  const toggleTheme = () => {
    if (isDisabled) return // 비활성화된 페이지에서는 동작하지 않음
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    // html class는 useEffect에서 일관 처리
  }

  return (
    <button
      onClick={toggleTheme}
      disabled={isDisabled}
      className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-all ${
        isDisabled 
          ? 'bg-gray-300/60 cursor-not-allowed opacity-50' 
          : 'bg-white/60 hover:scale-110'
      }`}
      aria-label="Toggle dark mode"
      title={isDisabled ? '이 페이지에서는 다크모드를 사용할 수 없습니다' : 'Toggle dark mode'}
    >
      {theme === 'dark'
        ? <Moon size={28} className="text-yellow-300" strokeWidth={1} />
        : <SunMedium size={28} className="text-yellow-500" strokeWidth={1} />}
    </button>
  )
}