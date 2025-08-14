'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { CATEGORY_ICONS } from '../categoryIcons'
import { useProducts } from '@/utils/hooks/useProducts'
import { Product } from '@/types'

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

  // 외부 클릭 처리
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  if (loading) return null
  if (error) return <div className="text-center py-10">카테고리 정보를 불러오지 못했습니다.</div>

  const replaceCategoryName = (cat: string) => cat.replace(/_/g, '/')

  return (
    <>
      <motion.div
        className="fixed inset-0 flex items-center justify-center z-[70] bg-black/50"
        onClick={handleBackdropClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          ref={modalRef}
          className="w-full max-w-xs sm:max-w-sm px-6 py-8 rounded-3xl shadow-2xl relative"
          style={{
            background: 'var(--background)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
            color: 'var(--foreground)',
            transition: 'background 0.6s, color 0.6s, border 0.6s',
          }}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ 
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          onClick={e => e.stopPropagation()}
        >
            {/* 닫기 버튼 */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={onClose}
              type="button"
              aria-label="닫기"
            >
              <X size={20} />
            </button>

            {/* 헤더 */}
            <div className="text-center mb-6">
              <p className="text-xl font-semibold text-[var(--foreground)]">카테고리</p>
            </div>
                
            {/* 카테고리 리스트 */}
            <div
              className="flex flex-col gap-2 overflow-y-auto hide-scrollbar"
              style={{
                maxHeight: '420px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {categories.map((category) => (
                <div
                  key={category}
                  className="flex items-center w-full gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => {
                    if (category === '전체') {
                      router.push('/products')
                    } else {
                      router.push(`/products/category?category=${encodeURIComponent(category)}`)
                    }
                    onClose()
                  }}
                >
                  {/* 아이콘 */}
                  <span className="text-2xl flex-shrink-0 w-8 text-center">
                    {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || '🍽️'}
                  </span>
                  {/* 카테고리명 */}
                  <span className="text-base font-medium flex-1">
                    {replaceCategoryName(category)}
                  </span>
                </div>
              ))}
                     </div>
       </motion.div>
     </motion.div>
     
     {/* 스크롤바 숨기기 */}
     <style>{`
       /* 스크롤바 숨기기 */
       .hide-scrollbar::-webkit-scrollbar { display: none; }
       .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
     `}</style>
   </>
 )
}
