// 로그인 페이지

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/utils/hooks/useAuth'
import ToastManager from '@/utils/toastManager'
import CheckGuestLogin from '@/components/modals/CheckGuestLogin'

export default function LoginPage() {
  const [userId, setUserId] = useState('')
  const [userPasswd, setUserPasswd] = useState('')
  const [message, setMessage] = useState('')
  const [showGuestModal, setShowGuestModal] = useState(false)
  const { login, loginLoading, loginError, guestLogin, guestLoginLoading, guestLoginError } = useAuth()
  const router = useRouter()

// 백엔드 에러 메시지 기반 세분화 함수
const getLoginErrorMessage = (error: any): string => {
  // 에러 메시지 추출
  let errorMsg = ''
  if (error instanceof Error) {
    errorMsg = error.message
  } else if (error?.message) {
    errorMsg = error.message
  } else if (loginError?.message) {
    errorMsg = loginError.message
  }

  // 디버깅용 로그
  console.log('Login error message:', errorMsg)

  // 백엔드에서 실제로 보내는 메시지 기반 분류
  const lowerMsg = errorMsg.toLowerCase()
  
  // 1. 회원가입 시 중복 아이디 (CustomerService.java:27)
  if (lowerMsg.includes('이미 존재하는 사용자') || lowerMsg.includes('already exists') || lowerMsg.includes('duplicate')) {
    return '이미 등록된 아이디입니다.'
  }
  
  // 2. 존재하지 않는 아이디 (SecurityConfig.java:55, CustomAuthenticationFilter.java:62)
  else if (lowerMsg.includes('사용자를 찾을 수 없습니다') || lowerMsg.includes('usernamenotfoundexception') || lowerMsg.includes('user not found')) {
    return '존재하지 않는 아이디입니다.'
  }
  
  // 3. 비밀번호 불일치 (Spring Security에서 BadCredentialsException 발생)
  else if (lowerMsg.includes('bad credentials') || lowerMsg.includes('비밀번호') || lowerMsg.includes('password') || lowerMsg.includes('credentials')) {
    return '비밀번호를 확인해주세요.'
  }
  
  // 4. 일반적인 인증 실패 (SecurityConfig.java:124-125)
  else if (lowerMsg.includes('로그인 실패') || lowerMsg.includes('authentication failed') || lowerMsg.includes('unauthorized')) {
    return '아이디 또는 비밀번호를 확인해주세요.'
  }
  
  // 5. 기본값
  else {
    return '로그인에 실패했습니다. 다시 시도해주세요.'
  }
}

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
  } catch (err: unknown) {
    const errorMessage = getLoginErrorMessage(err)
    setMessage(errorMessage)
  }
}

// 게스트 로그인 모달 열기
const handleGuestLoginClick = () => {
  setShowGuestModal(true)
}

// 실제 게스트 로그인 처리
const handleGuestLogin = async () => {
  setMessage('')
  setShowGuestModal(false)
  try {
    await guestLogin()
    
    // 게스트 로그인 성공 시 메시지 표시
    ToastManager.guestLoginSuccess()
    
    // router.push를 0ms 딜레이 후 실행 (state가 완전히 반영되도록)
    setTimeout(() => {
      router.push('/')
    }, 0)
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 
                        (err as { message?: string })?.message || 
                        guestLoginError?.message || 
                        '게스트 로그인 실패';
    setMessage(errorMessage);
  }
}

// 모달에서 회원가입 버튼 클릭
const handleModalSignup = () => {
  setShowGuestModal(false)
  router.push('/signup')
}

  return (
    <main className="min-h-screen flex flex-col items-center justify-center py-16"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}
    >
      <div className="w-full max-w-md px-6">
        {/* 헤더 */}
        <div className="text-center mb-2">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--sobi-green)' }}>
            로그인
          </h1>
        </div>

        {/* 로그인 폼 */}
        <div className="w-full max-w-sm mx-auto"
          style={{
            background: 'var(--search-modal-bg, rgba(255,255,255,0.85))',
            border: '1.5px solid var(--search-modal-border, rgba(255,255,255,0.18))',
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
                className="w-full rounded-xl px-4 py-3 text-base border-2 border-gray-200 focus:border-[var(--sobi-green)] focus:outline-none transition-all duration-300 ease-in-out focus:scale-[1.02] focus:shadow-lg"
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
                className="w-full rounded-xl px-4 py-3 text-base border-2 border-gray-200 focus:border-[var(--sobi-green)] focus:outline-none transition-all duration-300 ease-in-out focus:scale-[1.02] focus:shadow-lg"
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
                  로그인 중...
                </div>
              ) : "로그인"}
            </button>

          </form>

          {/* 에러 메시지 */}
          {(message || loginError || guestLoginError) && (
            <div className="mt-4 p-3 rounded-lg text-sm text-center"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}
            >
              {message || loginError?.message || guestLoginError?.message}
            </div>
          )}

          {/* 회원가입 버튼 */}
          <Link href="/signup">
            <button
              type="button"
              className="w-full rounded-xl py-3 text-base font-bold transition-all shadow-lg active:scale-95 border-2 mt-6"
              style={{ 
                backgroundColor: 'transparent',
                color: 'var(--sobi-green)',
                borderColor: 'var(--sobi-green)'
              }}
            >
              회원가입
            </button>
          </Link>

          {/* 구분선 */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500" style={{ backgroundColor: 'var(--search-modal-bg, rgba(255,255,255,0.85))' }}>
                또는
              </span>
            </div>
          </div>

          {/* 게스트 로그인 링크 */}
          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              서비스 이용이 처음이신가요?{' '}
              <button
                type="button"
                onClick={handleGuestLoginClick}
                className="font-semibold hover:opacity-80 transition-opacity bg-transparent border-none p-0 cursor-pointer"
                style={{ color: 'var(--sobi-green)' }}
              >
                게스트로 로그인
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* 게스트 로그인 확인 모달 */}
      <CheckGuestLogin
        open={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onGuestLogin={handleGuestLogin}
        onSignup={handleModalSignup}
        guestLoginLoading={guestLoginLoading}
      />
    </main>
  )
}
