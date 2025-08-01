// 메인 페이지

'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import { CirclePlus } from 'lucide-react'
import SearchBar from '@/components/SearchBar'
import PushSubscribeButton from '@/components/buttons/PushSubscribeButton'
import { useProducts } from '@/utils/hooks/useProducts'
import AccessTokenRefreshButton from '@/components/buttons/AccessTokenRefreshButton'
import { FaExclamationTriangle } from "react-icons/fa";
import { getPerformanceMonitor, logPerformanceInDev } from '@/utils/performance'

export default function Home() {
  const router = useRouter()
  const { products, loading, error } = useProducts()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('전체')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(true)

  // 성능 모니터링 시작
  useEffect(() => {
    const monitor = getPerformanceMonitor();
    if (monitor) {
      monitor.startMeasure('HomePage-Mount');
    }
    
    return () => {
      const monitor = getPerformanceMonitor();
      if (monitor) {
        monitor.endMeasure('HomePage-Mount');
      }
      // 개발 환경에서 성능 데이터 로깅
      logPerformanceInDev();
    };
  }, []);

  // products에서 카테고리 추출 (products가 변경될 때만 연산)
  const categories = useMemo(
    () =>
      products && Array.isArray(products)
        ? ['전체', ...Array.from(new Set(products.map((p) => p.category)))]
        : ['전체'],
    [products]
  )

  // PWA 설치 핸들러 (개선된 버전)
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
      console.log('PWA 설치 가능 - beforeinstallprompt 이벤트 발생')
    }
    
    // 이미 설치되었는지 확인
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        setShowInstallButton(false)
        console.log('PWA가 이미 설치되어 있음')
      }
    }
    
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setShowInstallButton(false)
      setDeferredPrompt(null)
      console.log('PWA 설치 완료')
    })
    
    checkIfInstalled()
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const isIOS = () =>
    typeof window !== 'undefined' &&
    /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())

  const isAndroid = () =>
    typeof window !== 'undefined' &&
    /android/.test(window.navigator.userAgent.toLowerCase())

  const handleInstallClick = async () => {
    if (isIOS()) {
      // iOS Safari 안내
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      if (isSafari) {
        alert("iOS Safari에서는:\n1. 하단 공유 버튼(□↑)을 탭하세요\n2. '홈 화면에 추가'를 선택하세요\n3. '추가'를 탭하세요")
      } else {
        alert("iOS에서는 Safari 브라우저에서만 설치할 수 있습니다.\nSafari로 접속해주세요.")
      }
      return
    }
    
    if (isAndroid()) {
      // Android Chrome 안내
      const isChrome = /chrome/i.test(navigator.userAgent)
      if (isChrome) {
        if (!deferredPrompt) {
          alert("Chrome에서 자동으로 설치 팝업이 나타나지 않으면:\n1. 주소창 옆 메뉴(⋮)를 탭하세요\n2. '앱 설치'를 선택하세요")
          return
        }
      } else {
        alert("Android에서는 Chrome 브라우저에서 설치할 수 있습니다.\nChrome으로 접속해주세요.")
        return
      }
    }
    
    if (!deferredPrompt) {
      console.log('설치 프롬프트가 없음')
      return
    }
    
    try {
      console.log('PWA 설치 시작')
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log('PWA 설치 결과:', outcome)
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setShowInstallButton(false)
        alert('SOBI 앱이 성공적으로 설치되었습니다! 🎉')
      } else {
        console.log('사용자가 설치를 거부함')
      }
    } catch (error) {
      console.error('PWA 설치 중 오류:', error)
      alert('설치 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  const handleSearch = () => {
    if (!keyword.trim()) return
    const query = new URLSearchParams()
    query.set('keyword', keyword)
    if (category && category !== '전체') {
      query.set('category', category)
    }
    router.push(`/products?${query.toString()}`)
  }

  // 커스텀 훅 사용할 때 로딩 시 에러 처리
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[300px] py-12"
      style={{ backgroundColor: 'var(--input-background)', color: 'var(--foreground)' }}
    >
      <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
      <div className="text-lg font-semibold text-[var(--foreground)]">메인 페이지로 이동 중...</div>
      <div className="text-sm text-gray-400 mt-1">조금만 기다려 주세요!</div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center min-h-[250px] py-10 text-center">
      <FaExclamationTriangle className="text-red-400 text-5xl mb-3 animate-bounce" />
      <div className="font-bold text-lg text-red-500 mb-2">문제가 발생했어요!</div>
      <div className="text-gray-500 text-base mb-4">{error.message}</div>
      <button
        className="mt-2 px-6 py-2 bg-red-500 text-white rounded-full shadow hover:bg-red-700 transition-all"
        onClick={() => window.location.reload()}
      >
        새로고침
      </button>
    </div>
  );

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-10">
        {/* <img
        src="/logo.png"
        alt="SOBI 로고"
        className="w-[220px] sm:w-[260px] mb-7 mt-6 select-none pointer-events-none"
        draggable={false}
        style={{
          filter: "drop-shadow(0 2px 10px #b7dcc0b8)",
          userSelect: "none",
        }}
      /> */}
      
      <SearchBar
        keyword={keyword}
        setKeyword={setKeyword}
        category={category}
        setCategory={setCategory}
        categories={categories}
        onSearch={handleSearch}
        showCategorySelect={false}
        showResultButton={true}
      />

      <PushSubscribeButton />
      <AccessTokenRefreshButton />

      <div className="flex items-center w-full max-w-md my-6">
        <div style={{ backgroundColor: 'var(--input-border)' }} className="flex-grow h-px" />
        <div className="px-4">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--sobi-green)' }}></div>
        </div>
        <div style={{ backgroundColor: 'var(--input-border)' }} className="flex-grow h-px" />
      </div>

      {showInstallButton && (
        <div className="flex items-center w-full max-w-sm my-2">
          <div className="w-full max-w-sm flex flex-col gap-3">
            <button
              onClick={handleInstallClick}
              className="flex items-center justify-center gap-2 rounded-md py-3 text-sm hover:opacity-80 transition-all"
              style={{
                backgroundColor: 'var(--sobi-green)',
                color: 'white',
                border: '1px solid var(--sobi-green)',
              }}
            >
              <CirclePlus size={22} strokeWidth={1.0} />
              {isIOS() ? "iOS 설치 안내" : "앱추가"}
            </button>
          </div>
        </div>
      )}

      <p className="text-sm text-center mt-2 mb-8" style={{ color: 'var(--text-secondary)' }}>
        iOS 사용자는 사파리의 공유 아이콘을 눌러 <br className="sm:hidden" />
        <strong style={{ color: 'var(--sobi-green)' }}>'홈 화면에 추가'</strong>를 선택해주세요.
      </p>
    </main>
  )
}
