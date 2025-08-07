'use client'

import { useEffect, useState } from 'react'
import { Moon, SunMedium } from 'lucide-react'

export default function DarkModeButton() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

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
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    // html class는 useEffect에서 일관 처리
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-3 rounded-full shadow-sm bg-white/60 hover:scale-110 transition-all backdrop-blur-sm"
      aria-label="Toggle dark mode"
    >
      {theme === 'dark'
        ? <Moon size={25} className="text-yellow-300" />
        : <SunMedium size={25} className="text-yellow-500" />}
    </button>
  )
}