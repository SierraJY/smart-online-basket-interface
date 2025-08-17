'use client'

import Link from 'next/link'
import { useEffect, useState } from "react";
import { useAuth } from '@/utils/hooks/useAuth'
import { User } from 'lucide-react'
import { motion } from 'framer-motion'

interface ProfileButtonProps {
  inline?: boolean; // true면 절대 위치 고정 없이 인라인으로 렌더링 (FAB 등에서 사용)
}

export default function ProfileButton({ inline = false }: ProfileButtonProps) {
  const { isLoggedIn, mounted, isGuestUser } = useAuth();
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

  const buttonEl = realLoggedIn ? (
    <Link href="/profile">
      <motion.div
        className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200"
        style={{ 
          backgroundColor: isGuestUser ? 'var(--guest-orange)' : 'var(--sobi-green)' 
        }}
        title={isGuestUser ? "게스트 프로필" : "프로필"}
        whileHover={{ 
          scale: 1.1,
          boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
        }}
        whileTap={{ scale: 0.95 }}
      >
        <User size={22} color="white" strokeWidth={1.5} />
      </motion.div>
    </Link>
  ) : (
    <Link href="/login">
      <motion.div
        className="flex items-center justify-center border-2 border-[var(--sobi-green)] w-10 h-10 rounded-full transition-all duration-200"
        style={{
          backgroundColor: 'var(--background)'
        }}
        title="로그인"
        whileHover={{ 
          scale: 1.1,
          boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
        }}
        whileTap={{ scale: 0.95 }}
      >
        <User size={22} color="var(--foreground)" strokeWidth={1.5} />
      </motion.div>
    </Link>
  );

  if (inline) return buttonEl;

  return (
    <div className="absolute right-5">{buttonEl}</div>
  );
}
