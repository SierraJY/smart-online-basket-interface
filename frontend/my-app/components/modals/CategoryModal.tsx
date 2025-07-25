'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { CATEGORY_ICONS } from '../categoryIcons'
import { useProducts } from '@/utils/hooks/useProducts'

interface CategoryModalProps {
  onClose: () => void
}

export default function CategoryModal({ onClose }: CategoryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  // ✅ 커스텀 훅으로 상품 데이터 받아오기!
  const { products, loading, error } = useProducts()

  // ✅ 카테고리 목록을 useMemo로 추출 (항상 return 위에서 선언)
  const categories = useMemo(
    () => ['전체', ...Array.from(new Set(products.map(p => p.category)))],
    [products]
  )

  // ✅ ESC 키 누르면 모달 닫기 (마운트 시 이벤트 등록/해제)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // ✅ Hook은 위에서 선언 끝낸 후에 조건문으로 분기!
  if (loading) return null // 스켈레톤 등 원하는 대로 바꿔도 OK
  if (error) return <div className="text-center py-10">카테고리 정보를 불러오지 못했습니다.</div>

  // ✅ 카테고리 이름 보기 좋게 언더바 → 슬래쉬로
  const replaceCategoryName = (cat: string) => cat.replace(/_/g, '/')

  return (
    <div
      ref={modalRef}
      className="w-full max-w-xl px-10 py-8 rounded-4xl shadow-2xl relative modal-fade-in" // 애니메이션 클래스 그대로!
      style={{
        background: 'var(--search-modal-bg, rgba(255,255,255,0.36))',
        border: '1.5px solid var(--search-modal-border, rgba(255,255,255,0.18))',
        boxShadow: '0 8px 32px 0 rgba(189, 189, 189, 0.33)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        color: 'var(--foreground)',
        transition: 'background 0.6s, color 0.6s, border 0.6s',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* 상단바 */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-xl font-bold tracking-tight">카테고리</div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:scale-95">
          <X size={26} />
        </button>
      </div>
      {/* 카테고리 그리드 */}
      <div
        className="grid grid-cols-3 gap-5 mb-2 overflow-y-auto"
        style={{
          maxHeight: '430px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {categories.map((category) => (
          <button
            key={category}
            className={`
              flex flex-col items-center gap-1 py-4 rounded-xl
              focus:outline-none
              transition font-semibold text-[16px]
              hover:scale-110 active:scale-100
              shadow-none border-none bg-transparent
            `}
            onClick={() => {
              if (category === '전체') {
                router.push('/products')
              } else {
                router.push(`/products/category?category=${encodeURIComponent(category)}`)
              }
              onClose()
            }}
            tabIndex={0}
            style={{
              minHeight: 100,
              fontWeight: 600,
              fontSize: '16px',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
            }}
          >
            <span
              className="text-[32px] mb-1"
              style={{ color: 'var(--foreground)' }}
            >
              {CATEGORY_ICONS[category] || 'NO IMAGE'}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--foreground)' }}
            >
              {replaceCategoryName(category)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}