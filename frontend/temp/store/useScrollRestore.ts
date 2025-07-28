import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 페이지별 스크롤 위치 기억 & 복원 (sessionStorage)
 * - 페이지 마운트/복귀시 sessionStorage에서 복원
 * - 스크롤/페이지이동/뒤로가기 때마다 자동 저장
 * - @param ready: 데이터가 다 준비된 후 true(예: 상품 리스트 도착 후)
 */

export function useScrollRestore(ready: boolean = true) {
  const pathname = usePathname()

  // 스크롤 위치 저장
  useEffect(() => {
    const onScroll = () => {
      sessionStorage.setItem(`scroll-pos:${pathname}`, String(window.scrollY))
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  // 복원은 "ready(데이터 준비 후) + 100ms 딜레이"!
  useEffect(() => {
    if (!ready) return
    const saved = sessionStorage.getItem(`scroll-pos:${pathname}`)
    if (saved) {
      setTimeout(() => {
        window.scrollTo({ top: parseInt(saved, 10), behavior: 'auto' })
      }, 100)
    }
  }, [pathname, ready])
}