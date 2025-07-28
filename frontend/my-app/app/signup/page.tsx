'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup } from '@/utils/api/auth'
import { useAuthStore } from '@/store/useAuthStore'

export default function SignupPage() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [gender, setGender] = useState(0)
  const [age, setAge] = useState(20)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const { setIsLoggedIn, setUserId: setUserIdStore } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage('비밀번호가 일치하지 않습니다.')
      return
    }
    setMessage('')
    try {
      const result = await signup({ userId, password, gender, age })
      setUserIdStore(result.userId)
      setIsLoggedIn(true)
      router.push('/')
    } catch (err: any) {
      setMessage(err.message || '회원가입 실패')
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-10 transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">회원가입</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          placeholder="아이디"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="rounded-md px-4 py-3 text-sm border"
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="rounded-md px-4 py-3 text-sm border"
          required
        />
        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="rounded-md px-4 py-3 text-sm border"
          required
        />
        <select
          value={gender}
          onChange={e => setGender(Number(e.target.value))}
          className="rounded-md px-4 py-3 text-sm border"
        >
          <option value={0}>남성</option>
          <option value={1}>여성</option>
        </select>
        <input
          type="number"
          placeholder="나이"
          value={age}
          min={1}
          max={99}
          onChange={e => setAge(Number(e.target.value))}
          className="rounded-md px-4 py-3 text-sm border"
          required
        />
        <button
          type="submit"
          className="rounded-md py-3 text-sm font-semibold transition-all bg-[var(--foreground)] text-[var(--background)]"
        >
          회원가입
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-red-600 text-center">{message}</p>}
      <p className="text-xs mt-6 text-center w-full max-w-sm text-[var(--text-secondary)]">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="underline text-green-700 dark:text-green-400">
          로그인 하기
        </Link>
      </p>
    </main>
  )
}
