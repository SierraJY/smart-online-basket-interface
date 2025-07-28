'use client'

import { useAuth } from '@/utils/auth/useAuth'
import { Radio } from 'lucide-react'
import Link from 'next/link'
import { VscAccount } from "react-icons/vsc";

export default function LoginOrLogout() {
    const { isLoggedIn, userId } = useAuth()
    return ( 
        <div className="text-xs font-medium flex justify-center">
        {isLoggedIn ? (
            <span className="flex items-center gap-1 text-green-600">
                  {userId}
              </span>
            ) : (
            <span className='text-[var(--foreground)]'>
                아직 회원이 아니신가요?{' '} 
                <Link href="/signup" 
                className='underline text-[var(--text-link)]'
                >
                회원가입 하기
                </Link>
            </span>
            )}
        </div>
    )
}