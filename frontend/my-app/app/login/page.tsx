// 로그인 페이지

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/utils/hooks/useAuth'
import ToastManager from '@/utils/toastManager'

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
    
    // 로그인 성공 시 환영 메시지 표시
    ToastManager.loginSuccess(userId)
    
    // router.push를 0ms 딜레이 후 실행 (state가 완전히 반영되도록)
    setTimeout(() => {
      router.push('/')
    }, 0)
  } catch (err: any) {
    setMessage(err?.message || loginError?.message || '로그인 실패')
  }
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
          <p className="text-lg font-semibold text-[var(--foreground)]">로그인</p>
        </div>

        {/* 로그인 폼 */}
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
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <input
                type="text"
                placeholder="아이디"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-base border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors"
                style={{ backgroundColor: 'var(--input-background)' }}
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="비밀번호"
                value={userPasswd}
                onChange={(e) => setUserPasswd(e.target.value)}
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
              disabled={loginLoading}
            >
              {loginLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  로그인 중...
                </div>
              ) : "로그인"}
            </button>
          </form>

          {/* 에러 메시지 */}
          {(message || loginError) && (
            <div className="mt-4 p-3 rounded-lg text-sm text-center"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}
            >
              {message || loginError?.message}
            </div>
          )}

          {/* 회원가입 링크 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              아직 회원이 아니신가요?{' '}
              <Link 
                href="/signup" 
                className="font-semibold hover:opacity-80 transition-opacity"
                style={{ color: 'var(--sobi-green)' }}
              >
                회원가입 하기
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
