
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import SearchBar from '@/components/SearchBar'
import { useProducts } from '@/utils/hooks/useProducts'

export default function SearchModalContent({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  // ✅ 커스텀 훅으로 상품 데이터 받아오기!
  const { products, loading, error } = useProducts()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('전체')

  // ✅ 카테고리 목록 useMemo로 추출 (항상 return 위에서 선언!)
  const categories = useMemo(
    () => ['전체', ...new Set(products.map((p) => p.category))],
    [products]
  )

  // ✅ ESC 누르면 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // ✅ Hook 선언 끝난 뒤에 조건문 분기!
  if (loading) return null
  if (error) return <div className="text-center py-10">검색 정보를 불러오지 못했습니다.</div>

  // ✅ 검색 이벤트 핸들러 (디자인/기능 동일!)
  const handleSearch = () => {
    if (!keyword.trim()) return
    const query = new URLSearchParams()
    query.set('keyword', keyword)
    if (category !== '전체') query.set('category', category)
    router.push(`/products?${query.toString()}`)
    onClose()
  }

  return (
    <div
      className="w-full max-w-md p-6 rounded-4xl shadow-lg relative modal-fade-in" // 애니메이션 클래스 그대로!
      style={{
        background: 'var(--search-modal-bg, rgba(255,255,255,0.36))',
        border: '1.5px solid var(--search-modal-border, rgba(255,255,255,0.18))',
        boxShadow: '0 8px 32px 0 rgba(189, 189, 189, 0.33)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        color: 'var(--foreground)',
        transition: 'background 0.6s, color 0.6s, border 0.6s',
      }}
    >
      <SearchBar
        keyword={keyword}
        setKeyword={setKeyword}
        category={category}
        setCategory={setCategory}
        categories={categories}
        onSearch={handleSearch}
        showCategorySelect={false}
      />
    </div>
  )
}