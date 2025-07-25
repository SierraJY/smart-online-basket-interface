'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import { CirclePlus } from 'lucide-react'
import SearchBar from '@/components/SearchBar'
import PushSubscribeButton from '@/components/PushSubscribeButton'
import { useProducts } from '@/utils/hooks/useProducts' // 👈 커스텀 훅 import!

export default function Home() {
  const router = useRouter()
  const { products, loading, error } = useProducts()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('전체')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(true)

  // products에서 카테고리 추출 (products가 변경될 때만 연산)
  const categories = useMemo(
    () => ['전체', ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  )

  // PWA 설치 핸들러 (기존과 동일)
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const isIOS = () =>
    typeof window !== 'undefined' &&
    /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())

  const handleInstallClick = async () => {
    if (isIOS()) {
      alert("iOS(아이폰/아이패드)에서는\n사파리 공유 아이콘 → '홈 화면에 추가'로만 설치할 수 있어요!")
      return
    }
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowInstallButton(false)
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
  if (loading) return <div>로딩 중...</div>
  if (error) return <div>에러: {error.message}</div>

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-10">
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

      <div className="flex items-center w-full max-w-md my-6">
        <div style={{ backgroundColor: 'var(--input-border)' }} className="flex-grow h-px" />
      </div>

      {showInstallButton && (
        <div className="flex items-center w-full max-w-sm my-2">
          <div className="w-full max-w-sm flex flex-col gap-3">
            <button
              onClick={handleInstallClick}
              className="flex items-center justify-center gap-2 rounded-md py-3 text-sm hover:opacity-80"
              style={{
                border: '1px solid var(--input-border)',
                backgroundColor: 'var(--input-background)',
                color: 'var(--foreground)',
              }}
            >
              <CirclePlus size={22} color='var(--foreground)' strokeWidth={1.0} />
              {isIOS() ? "iOS 설치 안내" : "앱추가"}
            </button>
          </div>
        </div>
      )}

      <p className="text-sm text-center mt-2 mb-8" style={{ color: 'var(--text-secondary)' }}>
        iOS 사용자는 사파리의 공유 아이콘을 눌러 <br className="sm:hidden" />
        <strong style={{ color: 'var(--foreground)' }}>'홈 화면에 추가'</strong>를 선택해주세요.
      </p>
    </main>
  )
}
