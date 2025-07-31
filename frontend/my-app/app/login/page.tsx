// 로그인 페이지

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/utils/hooks/useAuth'

export default function LoginPage() {
  const [userId, setUserId] = useState('')
  const [userPasswd, setUserPasswd] = useState('')
  const [message, setMessage] = useState('')
  const { login, loginLoading, loginError } = useAuth()
  const router = useRouter()

// page(login).tsx 중 handleLogin 부분만 수정!
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setMessage('')
  try {
    await login({ userId, userPasswd }) // 이게 비동기(setState)니까,
    // router.push를 0ms 딜레이 후 실행! (state가 완전히 반영되도록)
    setTimeout(() => {
      router.push('/')
    }, 0)
  } catch (err: any) {
    setMessage(err?.message || loginError?.message || '로그인 실패')
  }
}

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-10 transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">로그인test</h1>
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
          disabled={loginLoading}
        >
          {loginLoading ? "로그인 중..." : "로그인"}
        </button>
      </form>
      {(message || loginError) && <p className="mt-4 text-sm text-red-600 text-center">{message || loginError?.message}</p>}
      <p className="text-xs mt-6 text-center w-full max-w-sm text-[var(--text-secondary)]">
        아직 회원이 아니신가요?{' '}
        <Link href="/signup" className="underline text-green-700 dark:text-green-400">
          회원가입 하기
        </Link>
      </p>
    </main>
  )
}
