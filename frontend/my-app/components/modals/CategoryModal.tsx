'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronRight } from 'lucide-react'
import { CATEGORY_ICONS } from '../categoryIcons'
import { useProducts } from '@/utils/hooks/useProducts'

type Product = { category: string; [key: string]: any }

interface CategoryModalProps {
  onClose: () => void
}

export default function CategoryModal({ onClose }: CategoryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { products, loading, error } = useProducts()

  // 카테고리 배열 뽑기 (전체 + 중복제거 + 빈 문자열/공백 제외)
  const categories: string[] = useMemo(
    () => [
      '전체',
      ...Array.from(
        new Set(
          (products ?? [])
            .map((p: Product) => (p.category ?? '').trim())
            .filter((cat: string) => !!cat && cat.length > 0)
        )
      ) as string[],
    ],
    [products]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (loading) return null
  if (error) return <div className="text-center py-10">카테고리 정보를 불러오지 못했습니다.</div>

  const replaceCategoryName = (cat: string) => cat.replace(/_/g, '/')
  // console.log("products", products)
  // console.log("categories", categories)

  return (
    <div
      ref={modalRef}
      className="w-full max-w-xs sm:max-w-md px-3 py-8 rounded-4xl shadow-2xl relative modal-fade-in"
      style={{
        background: 'var(--search-modal-bg, rgba(255,255,255,0.96))',
        border: '1.5px solid var(--search-modal-border, rgba(255,255,255,0.18))',
        boxShadow: '0 8px 32px 0 rgba(189, 189, 189, 0.33)',
        backdropFilter: 'blur(10px)',
        color: 'var(--foreground)',
        transition: 'background 0.6s, color 0.6s, border 0.6s',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* 상단바 */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="text-xl font-bold tracking-tight">카테고리</div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:scale-95">
          <X size={26} />
        </button>
      </div>
      {/* 카테고리 리스트 */}
      <div
        className="flex flex-col gap-1 overflow-y-auto hide-scrollbar"
        style={{
          maxHeight: '420px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {categories.map((category) => (
          <div
            key={category}
            className={`
              flex items-center w-full gap-3 px-2 py-3 rounded-lg
              min-h-[44px]
              cursor-default select-none
            `}
            tabIndex={-1}
          >
            {/* 아이콘 */}
            <span
              className="text-2xl flex-shrink-0 w-7 text-center"
              style={{ color: 'var(--foreground)' }}
            >
              {CATEGORY_ICONS[category] || '🍽️'}
            </span>
            {/* 카테고리명 */}
            <span
              className={`text-[16px] font-semibold flex-1 text-left`}
              style={{ color: 'var(--foreground)' }}
            >
              {replaceCategoryName(category)}
            </span>
            {/* 화살표 버튼 */}
            <button
              className="p-1 rounded-full transition hover:scale-110 active:scale-95"
              tabIndex={0}
              aria-label="이동"
              style={{ outline: 'none' }}
              onClick={() => {
                if (category === '전체') {
                  router.push('/products')
                } else {
                  router.push(`/products/category?category=${encodeURIComponent(category)}`)
                }
                onClose()
              }}
            >
              <ChevronRight className="text-black" size={22} strokeWidth={2.8} />
            </button>
          </div>
        ))}
      </div>
      {/* 스크롤바 숨기기 */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
