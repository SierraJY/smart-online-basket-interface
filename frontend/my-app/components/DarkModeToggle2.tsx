'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function DarkModeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = saved ?? (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return (
    <div className="fixed bottom-[115px] left-4 z-50">
      <button
        onClick={toggleTheme}
        className="w-20 h-12 bg-[var(--toggle-bg)] rounded-full flex items-center px-1 transition-colors duration-300"
        aria-label="Toggle dark mode"
      >
        <div
          className={`w-10 h-10 rounded-full bg-[var(--toggle-knob)] shadow-md flex items-center justify-center transform transition-transform duration-300
          ${theme === 'dark' ? 'translate-x-8' : 'translate-x-0'}`}
        >
          {theme === 'dark' ? (
            <Moon size={20} className="text-[var(--background)]" />
          ) : (
            <Sun size={20} className="text-yellow-600" />
          )}
        </div>
      </button>
    </div>
  )
}