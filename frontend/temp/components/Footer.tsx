'use client'

import Link from 'next/link'
import { useAuth } from '@/utils/auth/useAuth'
import {
  LogOut,
  PackageSearch,
  Heart,
  CircleUserRound,
  Home,
} from 'lucide-react'

export default function Footer() {
  const { isLoggedIn, userId, logout } = useAuth()

  return (
    <footer
      className="
        fixed bottom-8 left-1/2 -translate-x-1/2 w-[75%] max-w-lg
        rounded-full shadow-md px-10 py-6 flex justify-between items-center z-50 transition-all
        bg-[var(--footer-background)]
        backdrop-blur-xs
        border border-[var(--footer-border)]
        backdrop-saturate-200
        text-[var(--foreground)]
      "
    >
      <Link href="/" className='hover:scale-110'>
        <Home size={22} color='var(--foreground)' strokeWidth={1.5} />
      </Link>

      <Link href="/products" className='hover:scale-110'>
        <PackageSearch size={22} color='var(--foreground)' strokeWidth={1.5} />
      </Link>

      <Link href="/wishlist" className='hover:scale-110'>
        <Heart size={22} color='var(--foreground)' strokeWidth={1.5} />
      </Link>

      {isLoggedIn ? (
        <button onClick={logout} className='hover:scale-110 cursor-pointer'>
          <LogOut size={22} color='var(--foreground)' strokeWidth={1.5} />
        </button>
      ) : (
        <Link href="/login" className='hover:scale-110'>
          <CircleUserRound size={22}color='var(--foreground)' strokeWidth={1.5} />
        </Link>
      )}
    </footer>
  )
}