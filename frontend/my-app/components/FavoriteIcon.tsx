import Image from 'next/image'
import { useState } from 'react'
import { useAuth } from '@/utils/hooks/useAuth'
import { useFavorite } from '@/utils/hooks/useFavorite'
import ToastManager from '@/utils/toastManager'

interface FavoriteIconProps {
  productId: number
  className?: string
  readOnly?: boolean // 읽기 전용 모드 (클릭 불가)
}

export default function FavoriteIcon({ productId, className = '', readOnly = false }: FavoriteIconProps) {
  const { isLoggedIn, accessToken: token } = useAuth()
  const { favoriteList, addFavorite, removeFavorite, loading } = useFavorite(token)
  const [isToggling, setIsToggling] = useState(false)

  // 로그인하지 않은 경우 아무것도 표시하지 않음 (찜 기능은 회원전용)
  if (!isLoggedIn || !token) {
    return null
  }

  const isFavorited = favoriteList.includes(productId)

  // 읽기 전용 모드이고 찜하지 않은 상품이면 아무것도 표시하지 않음
  if (readOnly && !isFavorited) {
    return null
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isToggling || loading) return
    
    setIsToggling(true)
    try {
              if (isFavorited) {
          await removeFavorite({ productId, token })
          ToastManager.favoriteRemoved()
        } else {
          await addFavorite({ productId, token })
          ToastManager.favoriteAdded()
        }
    } catch (error) {
      console.error('찜 토글 실패:', error)
      ToastManager.favorite('찜 처리 중 오류가 발생했습니다')
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <button
      onClick={readOnly ? undefined : handleToggleFavorite}
      disabled={isToggling || loading || readOnly}
      className={`${readOnly ? 'absolute top-1 left-1' : ''} z-10 p-1 transition-all duration-200 ${!readOnly ? 'hover:scale-110' : ''} ${className} ${
        isToggling || loading ? 'cursor-not-allowed opacity-70' : ''
      }`}
      aria-label={readOnly ? '찜한 상품' : (isFavorited ? '찜 해제' : '찜 추가')}
    >
      <Image
        src="/icon/favorite.png"
        alt="찜 아이콘"
        width={24}
        height={24}
        className={`transition-all duration-200 ${isFavorited ? 'opacity-100' : 'opacity-60'} ${
          isToggling || loading ? 'animate-pulse' : ''
        }`}
        style={{
          filter: isFavorited ? 'none' : 'grayscale(100%) brightness(0.8)'
        }}
        sizes="24px"
        quality={85}
      />
    </button>
  )
} 