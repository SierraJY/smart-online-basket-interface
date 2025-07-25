// 회원가입 페이지

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { registerUser, setToken } from '@/utils/auth/authUtils'
import { useAuthStore } from '@/store/useAuthStore'

export default function SignupPage() {
  const [name, setNameInput] = useState('')
  const [email, setEmailInput] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const { setIsLoggedIn, setEmail, setName } = useAuthStore()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage('비밀번호가 일치하지 않습니다.')
      return
    }
    const error = registerUser({ name, email: email.trim(), password })

    if (error) {
      setMessage(error)
    } else {
      setToken(email)
      setIsLoggedIn(true)
      setEmail(email)
      setName(name)
      router.push('/')
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-10 transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Create an account</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setNameInput(e.target.value)}
          className="rounded-md px-4 py-3 text-sm border border-[var(--input-border)] bg-[var(--input-background)] text-[var(--foreground)]"
        />
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
        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        Sign up
      </button>
      </form>
      {message && <p className="mt-4 text-sm text-red-600 text-center">{message}</p>}
      <p className="text-xs mt-6 text-center w-full max-w-sm text-[var(--text-secondary)]">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="underline text-green-700 dark:text-green-400">로그인 하기</Link>
      </p>

      <div className="flex items-center w-full max-w-sm my-6">
        <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
        <span className="mx-3 text-sm text-[var(--text-secondary)]">or</span>
        <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
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