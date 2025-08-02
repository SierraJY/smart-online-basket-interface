// 화원가입 페이지

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/utils/hooks/useAuth'
import WhatsUrGenderOrAge from '@/components/modals/WhatsUrGenderOrAge'

export default function SignupPage() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [gender, setGender] = useState(1)
  const [age, setAge] = useState(20)
  const [message, setMessage] = useState('')
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()
  const { signup, signupLoading, signupError } = useAuth()

  const handleSubmit = async () => {
    try {
      await signup({ userId, password, gender, age })
      router.push('/')
    } catch (err: any) {
      setMessage(err?.message || signupError?.message || '회원가입 실패')
    }
  }

  const handleFirstStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage('비밀번호가 일치하지 않습니다.')
      return
    }
    setMessage('')
    setShowModal(true)
  }

  const handleModalSubmit = () => {
    setShowModal(false)
    handleSubmit()
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-10 transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">회원가입test</h1>
      <form onSubmit={handleFirstStep} className="w-full max-w-sm flex flex-col gap-4">
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
        <button
          type="submit"
          className="rounded-md py-3 text-sm font-semibold transition-all bg-[var(--foreground)] text-[var(--background)]"
          disabled={signupLoading}
        >
          {signupLoading ? "가입 중..." : "회원가입"}
        </button>
      </form>
      {(message || signupError) && <p className="mt-4 text-sm text-red-600 text-center">{message || signupError?.message}</p>}
      <p className="text-xs mt-6 text-center w-full max-w-sm text-[var(--text-secondary)]">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="underline text-green-700 dark:text-green-400">
          로그인 하기
        </Link>
      </p>
      <WhatsUrGenderOrAge
        open={showModal}
        gender={gender}
        age={age}
        setGender={setGender}
        setAge={setAge}
        onClose={() => setShowModal(false)}
        onSubmit={handleModalSubmit}
      />
    </main>
  )
}
