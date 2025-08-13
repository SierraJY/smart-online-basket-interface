'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/utils/hooks/useAuth'
import { apiClient } from '@/utils/api/apiClient'
import { config } from '@/config/env'
import { useBasketId, useActivatedBasketId } from '@/store/useBasketStore'

import LogoutButton from '@/components/buttons/LogoutButton'
import { 
  User, 
  Sparkles
} from 'lucide-react'
import { FcSurvey } from "react-icons/fc"
import { FiUserX } from "react-icons/fi"
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import ToastManager from '@/utils/toastManager'
import WithdrawalModal from '@/components/modals/WithdrawalModal'

interface ProfileData {
  gender: number
  id: number
  userId: string
  age: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { isLoggedIn, mounted, isGuestUser, accessToken } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [withdrawalLoading, setWithdrawalLoading] = useState(false)
  
  // 바구니 상태 확인 (상태 표시용)
  const basketId = useBasketId()
  const activatedBasketId = useActivatedBasketId()
  
  // 바구니 사용 중인지 확인하는 함수 (상태 표시용)
  const isBasketInUse = () => {
    return !!(basketId && activatedBasketId)
  }

  // 프로필 데이터 가져오기
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('프로필 API 요청 시작')
        setLoading(true)
        const response = await apiClient.get(config.API_ENDPOINTS.CUSTOMERS_PROFILE)
        
        if (response.ok) {
          const data = await response.json()
          console.log('프로필 데이터 받음:', data)
          setProfileData(data)
        } else {
          throw new Error('프로필 정보를 가져올 수 없습니다.')
        }
      } catch (err) {
        console.error('프로필 조회 오류:', err)
        setError('프로필 정보를 불러오는데 실패했습니다.')
        ToastManager.error('프로필 정보를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    // mounted 상태가 true이고 로그인된 상태일 때만 API 요청
    if (mounted && isLoggedIn) {
      console.log('프로필 페이지 - API 요청 조건 충족')
      fetchProfile()
    } else if (mounted && !isLoggedIn) {
      console.log('프로필 페이지 - 로그인되지 않음, 로그인 페이지로 이동')
      router.push('/login')
    }
  }, [mounted, isLoggedIn, router])

  // 로그아웃 성공 시 처리
  const handleLogoutSuccess = () => {
    router.push('/login')
  }

  // 회원 탈퇴 처리
  const handleWithdrawal = () => {
    setShowWithdrawalModal(true)
  }

  // 회원 탈퇴 확인 처리
  const confirmWithdrawal = async () => {
    if (!accessToken) {
      ToastManager.error('인증 정보가 없습니다.')
      return
    }

    setWithdrawalLoading(true)

    try {
      const response = await apiClient.post(config.API_ENDPOINTS.CUSTOMERS_WITHDRAWAI)
      
      if (response.ok) {
        // 탈퇴 완료 페이지로 이동 (접근 권한 부여)
        sessionStorage.setItem('withdrawalAccess', 'true')
        router.push('/withdrawal')
      } else {
        throw new Error('회원 탈퇴에 실패했습니다.')
      }
    } catch (err) {
      console.error('회원 탈퇴 오류:', err)
      ToastManager.error('회원 탈퇴 중 오류가 발생했습니다.')
    } finally {
      setWithdrawalLoading(false)
      setShowWithdrawalModal(false)
    }
  }

  // mounted 상태 확인 (Hydration 오류 방지)
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen" 
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen" 
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" 
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">프로필 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 오류 발생
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen" 
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-15 background-paper"
    style={{
      backgroundColor: 'var(--background)',
    }}
    >
      <div className="max-w-md mx-auto px-4 py-6">
        {/* 프로필 정보 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[var(--footer-background)] backdrop-blur-xs border border-[var(--footer-border)] rounded-2xl shadow-lg p-6 mb-6 relative"
        >
          {/* 로그아웃 버튼 */}
          <LogoutButton 
            onLogoutSuccess={handleLogoutSuccess}
          />
          
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
              background: isGuestUser 
                ? `linear-gradient(135deg, var(--guest-orange) 0%, rgba(240, 149, 45, 0.8) 100%)`
                : `linear-gradient(135deg, var(--sobi-green) 0%, rgba(45, 192, 126, 0.8) 100%)`,
            }}>
              <User size={30} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                {profileData?.userId}
              </h2>
              <div className="text-sm text-[var(--text-secondary)] space-y-1 mt-1">
                <p>나이: {profileData?.age === 0 ? '선택안함' : `${profileData?.age}세`}</p>
                <p>성별: {profileData?.gender === 0 ? '선택안함' : profileData?.gender === 1 ? '남성' : '여성'}</p>
                <p>회원번호: {profileData?.id}</p>
                
                {/* 바구니 사용 상태 표시 */}
                {isBasketInUse() && (
                  <div className="flex items-center gap-2 mt-2 p-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <p className="text-[var(--text-secondary)]">
                      {basketId}번 장바구니 사용 중
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 메뉴 리스트 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-3"
        >
          {/* 찜목록 */}
          <Link href="/favorite">
            <div className="bg-[var(---background)] rounded-xl p-4 transition-all duration-200 cursor-pointer group hover:scale-[1.02]">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-[var(--sobi-green)] transition-colors">
                  <Image
                    src="/icon/favorite.png"
                    alt="찜목록"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--foreground)]">찜목록</h3>
                  <p className="text-sm text-[var(--text-secondary)]">관심 상품들을 확인해보세요</p>
                </div>
              </div>
            </div>
          </Link>

          {/* 구매내역 */}
          <Link href={"/receipts"}>
            <div className="bg-[var(---background)] rounded-xl p-4 transition-all duration-200 cursor-pointer group hover:scale-[1.02]">
              <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-[var(--sobi-green)] transition-colors">
                  <FcSurvey size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--foreground)]">구매내역</h3>
                  <p className="text-sm text-[var(--text-secondary)]">구매내역을 확인해보세요</p>
                </div>
              </div>
            </div>
          </Link>

          {/* AI 추천 */}
          <div className="bg-[var(---background)] rounded-xl p-4 transition-all duration-200 cursor-pointer group hover:scale-[1.02]">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center">
                <Sparkles size={24} className="text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--foreground)]">AI 추천</h3>
                <p className="text-sm text-[var(--text-secondary)]">준비 중</p>
              </div>
              <div className="text-[var(--text-secondary)]">
                <span className="text-xs bg-[var(--footer-border)] px-2 py-1 rounded-full">준비중</span>
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-[var(--footer-border)] my-4"></div>

          {/* 회원 탈퇴 - 게스트 사용자에게는 표시하지 않음 */}
          {!isGuestUser && (
            <button onClick={handleWithdrawal} className="w-full">
              <div className="bg-[var(---background)] rounded-xl p-4 transition-all duration-200 group hover:scale-[1.02] hover:bg-red-50 dark:hover:bg-red-900/10 opacity-50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors">
                    <FiUserX size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[var(--foreground)]">회원 탈퇴</h3>
                    <p className="text-sm text-[var(--text-secondary)]">계정을 영구적으로 삭제합니다</p>
                  </div>
                </div>
              </div>
            </button>
          )}
        </motion.div>
      </div>

      {/* 회원 탈퇴 확인 모달 */}
      <WithdrawalModal
        open={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onConfirm={confirmWithdrawal}
        loading={withdrawalLoading}
      />
    </div>
  )
} 