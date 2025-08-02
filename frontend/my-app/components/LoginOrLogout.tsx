'use client'

import Link from 'next/link'
import { useEffect, useState } from "react";
import { useAuth } from '@/utils/hooks/useAuth'
import { CircleUserRound, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation';

export default function LoginOrLogout() {
  const { isLoggedIn, userId, mounted, logout } = useAuth();
  const [realLoggedIn, setRealLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const calc = () => {
      setRealLoggedIn(
        (typeof window !== "undefined" && !!localStorage.getItem("accessToken")) || isLoggedIn
      );
    };
    calc();
    window.addEventListener("authChanged", calc);
    window.addEventListener("storage", calc);
    return () => {
      window.removeEventListener("authChanged", calc);
      window.removeEventListener("storage", calc);
    };
  }, [isLoggedIn]);

  // 로그아웃 버튼 클릭 핸들러
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!mounted) return null;

  return (
    <div className="fixed w-full left-0 right-0 bottom-28 z-[99] flex justify-center items-center pointer-events-none">
      <div className="pointer-events-auto">
        {realLoggedIn ? (
          <span className="flex items-center gap-2 text-green-600 text-xs font-medium">
            <CircleUserRound size={18} className="mr-1" />
            {userId ?? "로그인됨"}
            {/* <span className="ml-2 text-gray-400">(로그인 상태)</span> */}
            <button
              onClick={handleLogout}
              className="ml-2 text-[var(--foreground)] hover:text-red-500 rounded px-2 py-0.5 transition"
              title="로그아웃"
            >
              <LogOut size={16} className="inline -mt-0.5 mr-1" />
            </button>
          </span>
        ) : (
          <span className="text-xs font-medium flex items-center gap-1 text-[var(--foreground)]">
            아직 회원이 아니신가요?{" "}
            <Link href="/signup" className="underline text-[var(--text-link)] ml-1">
              회원가입
            </Link>
            <span className="mx-2">|</span>
            <Link href="/login" className="underline text-[var(--text-link)]">
              로그인
            </Link>
          </span>
        )}
      </div>
    </div>
  )
}
