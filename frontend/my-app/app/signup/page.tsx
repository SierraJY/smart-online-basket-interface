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
    <main className="min-h-screen flex flex-col items-center justify-center py-16"
      style={{ 
        background: 'linear-gradient(var(--background-overlay-heavy), var(--background-overlay-heavy)), url("/paper2.jpg")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}
    >
      <div className="w-full max-w-md px-6">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--sobi-green)' }}>
            SOBI
          </h1>
          <p className="text-lg font-semibold text-[var(--foreground)]">회원가입</p>
        </div>

        {/* 회원가입 폼 */}
        <div className="w-full max-w-sm mx-auto"
          style={{
            background: 'var(--search-modal-bg, rgba(255,255,255,0.85))',
            border: '1.5px solid var(--search-modal-border, rgba(255,255,255,0.18))',
            boxShadow: '0 8px 32px 0 rgba(189, 189, 189, 0.33)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '24px',
            padding: '32px'
          }}
        >
          <form onSubmit={handleFirstStep} className="flex flex-col gap-4">
            <div>
              <input
                type="text"
                placeholder="아이디"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-base border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                style={{ backgroundColor: 'var(--input-background)' }}
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-base border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                style={{ backgroundColor: 'var(--input-background)' }}
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-base border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                style={{ backgroundColor: 'var(--input-background)' }}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl py-3 text-base font-bold transition-all shadow-lg active:scale-95"
              style={{ 
                backgroundColor: 'var(--sobi-green)',
                color: 'white'
              }}
              disabled={signupLoading}
            >
              {signupLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  가입 중...
                </div>
              ) : "다음 단계"}
            </button>
          </form>

          {/* 에러 메시지 */}
          {(message || signupError) && (
            <div className="mt-4 p-3 rounded-lg text-sm text-center"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}
            >
              {message || signupError?.message}
            </div>
          )}

          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              이미 계정이 있으신가요?{' '}
              <Link 
                href="/login" 
                className="font-semibold hover:opacity-80 transition-opacity"
                style={{ color: 'var(--sobi-green)' }}
              >
                로그인 하기
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* 성별/나이 선택 모달 */}
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
