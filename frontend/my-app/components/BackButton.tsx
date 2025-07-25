'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function BackButton() {
  const router = useRouter()
  const pathname = usePathname()

  if (pathname === '/') return null  // 홈에선 안 보여줌

  return (
    <button
      onClick={() => router.back()}
      className="fixed top-4 left-4 z-50 p-2 hover:scale-120 active:scale-120 transition"
    >
    <ChevronLeft size={30} color='var(--foreground)' strokeWidth={2} />
       

    </button>
  )
}