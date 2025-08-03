'use client'

import Link from 'next/link'
import { useEffect, useState } from "react";
import { useAuth } from '@/utils/hooks/useAuth'
import {  User } from 'lucide-react'

export default function ProfileButton() {
  const { isLoggedIn, userId, mounted } = useAuth();
  const [realLoggedIn, setRealLoggedIn] = useState(false);

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

  if (!mounted) return null;

  return (
    <div className="absolute top-0 right-5">
      {realLoggedIn ? (
        <Link 
          href="/profile" 
          className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200"
          title="마이페이지"
        >
          <User size={22} color="var(--sobi-green)" strokeWidth={1.5} />
        </Link>
      ) : (
        <Link 
          href="/login" 
          className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200d"
          title="로그인"
        >
          <User size={22} color="var(--foreground)" strokeWidth={1.5} />
        </Link>
      )}
    </div>
  )
}
