'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BackButtonProps {
  className?: string
  onClick?: () => void
}

export default function BackButton({ className = '', onClick }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.back()
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`
        w-10 h-10 flex items-center justify-center rounded-full
        z-50 hover:scale-110 transition-all ${className}
      `}
      style={{
        backgroundColor: 'var(--background)',
        border: '1px solid var(--footer-border)',
        backdropFilter: 'blur(10px) saturate(140%)'
      }}
      aria-label="뒤로 가기"
    >
      <ChevronLeft size={30} color="var(--foreground)" strokeWidth={1.8} />
    </button>
  )
} 