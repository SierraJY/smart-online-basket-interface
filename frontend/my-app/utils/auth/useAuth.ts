'use client'

import { useEffect } from 'react'
import { getToken, removeToken } from '@/utils/auth/authUtils'
import { useAuthStore } from '@/store/useAuthStore'
import { getWishlist } from '../wishlistUtils'

// 현재 로그인 상태 확인 및 자동 로그인 적용
export const useAuth = () => {
  const { isLoggedIn, setIsLoggedIn, email, name, setEmail, setName, setWishlist } = useAuthStore()

  useEffect(() => {
    const token = getToken()

    if (token) {
      const emailFromToken = token.split('-token')[0]
      setIsLoggedIn(true)
      setEmail(emailFromToken)

      const users = JSON.parse(localStorage.getItem('users') || '[]')
      const currentUser = users.find((u: any) => u.email === emailFromToken)
      if (currentUser) setName(currentUser.name)

      // 로그인한 사용자 기준 찜목록 불러오기
      setWishlist(getWishlist(emailFromToken))
    } else {
      setIsLoggedIn(false)
      setEmail(email)

    }
  }, [])

  const logout = () => {
    removeToken()
    setIsLoggedIn(false)
    setEmail(email)

  }

  return { isLoggedIn, email, name, logout }
}
