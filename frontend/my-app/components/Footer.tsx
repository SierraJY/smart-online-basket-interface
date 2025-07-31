'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/utils/hooks/useAuth'
import {
  LogOut, PackageSearch, Heart, CircleUserRound, Home, ShoppingBasket,
} from 'lucide-react'

export default function Footer() {
  const router = useRouter()
  const { isLoggedIn, logout, mounted } = useAuth();

  // localStorage 상태 동기화 (실시간)
  const realLoggedIn =
    (typeof window !== "undefined" && !!localStorage.getItem("accessToken")) || isLoggedIn;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!mounted) return null;

  return (
    <footer
      className="
        fixed bottom-8 left-1/2 -translate-x-1/2 w-[75%] max-w-lg
        rounded-full shadow-md px-10 py-6 flex flex-col items-center z-50 transition-all
        bg-[var(--footer-background)]
        backdrop-blur-xs
        border border-[var(--footer-border)]
        backdrop-saturate-200
        text-[var(--foreground)]
      "
    >
      {/* 네비/아이콘 버튼들 */}
      <div className="flex flex-row justify-between items-center w-full">
        <Link href="/" className="hover:scale-110" title="홈">
          <Home size={22} color="var(--foreground)" strokeWidth={1.5} />
        </Link>
        <Link href="/products" className="hover:scale-110" title="상품목록">
          <PackageSearch size={22} color="var(--foreground)" strokeWidth={1.5} />
        </Link>
        <Link href="/baskets" className="hover:scale-110" title="장바구니">
          <ShoppingBasket size={24} color="var(--foreground)" strokeWidth={1.5} />
        </Link>
        <Link href="/favorite" className="hover:scale-110" title="찜목록">
          <Heart size={22} color="var(--foreground)" strokeWidth={1.5} />
        </Link>
        {/* {realLoggedIn ? (
          <button
            onClick={handleLogout}
            className="hover:scale-110 cursor-pointer"
            title="로그아웃"
          >
            <LogOut size={22} color="var(--foreground)" strokeWidth={1.5} />
          </button>
        ) : (
          <Link href="/login" className="hover:scale-110" title="로그인">
            <CircleUserRound size={22} color="var(--foreground)" strokeWidth={1.5} />
          </Link>
        )} */}
      </div>
    </footer>
  )
}
