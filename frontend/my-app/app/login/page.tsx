'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/utils/api/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { setToken } from '@/utils/auth/authUtils'

export default function LoginPage() {
  const [userId, setUserId] = useState('')
  const [userPasswd, setUserPasswd] = useState('')
  const [message, setMessage] = useState('')
  const { setIsLoggedIn, setUserId: setUserIdStore, setAccessToken, setRefreshToken } = useAuthStore()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    try {
      const result = await login({ userId, userPasswd })
      setUserIdStore(result.userId)
      setIsLoggedIn(true)
      setAccessToken(result.accessToken)
      setRefreshToken(result.refreshToken)
      setToken(result.accessToken) // localStorage 저장
      router.push('/')
    } catch (err: any) {
      setMessage(err.message || '로그인 실패')
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-10 transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">로그인</h1>
      <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          placeholder="아이디"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="rounded-md px-4 py-3 text-sm border"
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={userPasswd}
          onChange={(e) => setUserPasswd(e.target.value)}
          className="rounded-md px-4 py-3 text-sm border"
          required
        />
        <button
          type="submit"
          className="rounded-md py-3 text-sm font-semibold transition-all bg-[var(--foreground)] text-[var(--background)]"
        >
          로그인
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-red-600 text-center">{message}</p>}
      <p className="text-xs mt-6 text-center w-full max-w-sm text-[var(--text-secondary)]">
        아직 회원이 아니신가요?{' '}
        <Link href="/signup" className="underline text-green-700 dark:text-green-400">
          회원가입 하기
        </Link>
      </p>
    </main>
  )
}
