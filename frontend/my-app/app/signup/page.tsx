'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup } from '@/utils/api/auth'
import { useAuthStore } from '@/store/useAuthStore'
import WhatsUrGenderOrAge from '@/components/modals/WhatsUrGenderOrAge'

export default function SignupPage() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [gender, setGender] = useState(1) // 기본값 남자
  const [age, setAge] = useState(20) // 기본값 20세
  const [message, setMessage] = useState('')
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()
  const { setIsLoggedIn, setUserId: setUserIdStore } = useAuthStore()

  // 회원가입 (최종)
  const handleSubmit = async () => {
    try {
      const result = await signup({ userId, password, gender, age })
      setUserIdStore(result.userId)
      setIsLoggedIn(true)
      router.push('/')
    } catch (err: any) {
      setMessage(err.message || '회원가입 실패')
    }
  }

  // 1차 폼(아이디/비번)에서 회원가입 버튼
  const handleFirstStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage('비밀번호가 일치하지 않습니다.')
      return
    }
    setMessage('')
    setShowModal(true)
  }

  // 모달에서 완료 버튼
  const handleModalSubmit = () => {
    setShowModal(false)
    handleSubmit()
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-10 transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">회원가입</h1>
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
