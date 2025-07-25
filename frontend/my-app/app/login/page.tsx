// 로그인 페이지 (localstorage 임시테스트)

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/store/useAuthStore'
import { setToken } from '@/utils/auth/authUtils'

export default function LoginPage() {
  const [email, setEmailInput] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const { setIsLoggedIn, setEmail } = useAuthStore()
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]')
    const user = storedUsers.find((u: any) => u.email === email && u.password === password)

    if (user) {
      setToken(email)
      setIsLoggedIn(true)
      setEmail(email)
      router.push('/')
    } else {
      setMessage('이메일 또는 비밀번호가 잘못되었습니다.')
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-10 transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Login</h1>
      <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmailInput(e.target.value)}
          className="rounded-md px-4 py-3 text-sm border border-[var(--input-border)] bg-[var(--input-background)] text-[var(--foreground)]"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md px-4 py-3 text-sm border border-[var(--input-border)] bg-[var(--input-background)] text-[var(--foreground)]"
        />
        <button
          type="submit"
          className="rounded-md py-3 text-sm font-semibold transition-all"
          style={{
            backgroundColor: 'var(--foreground)',
            color: 'var(--background)',
          }}
        >
          Login
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-red-600 text-center">{message}</p>}

      <p className="text-xs mt-6 text-center w-full max-w-sm text-[var(--text-secondary)]">
        아직 회원이 아니신가요?{' '}
        <Link href="/signup" className="underline text-green-700 dark:text-green-400">
          회원가입 하기
        </Link>
      </p>

      <div className="flex items-center w-full max-w-sm my-6">
        <div className="flex-grow h-px bg-[var(--input-border)]"></div>
        <span className="mx-3 text-sm text-[var(--text-secondary)]">or</span>
        <div className="flex-grow h-px bg-[var(--input-border)]"></div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <button className="flex items-center justify-center gap-2 border border-[var(--input-border)] rounded-md py-3 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800">
          <Image
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            width={20}
            height={20}
          />
          Continue with Google
        </button>
      </div>
    </main>
  )
}