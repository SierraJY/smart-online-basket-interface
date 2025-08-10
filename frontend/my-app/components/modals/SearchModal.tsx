'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import SearchBar from '@/components/SearchBar'
import { useProducts } from '@/utils/hooks/useProducts'
import { Product } from '@/types'
import { CategoryName, isValidCategory } from '@/components/categoryIcons'

// SearchModal Props 타입 정의
interface SearchModalProps {
  onClose: () => void;
}

export default function SearchModalContent({ onClose }: SearchModalProps) {
  const router = useRouter()
  const { products, loading, error } = useProducts()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<CategoryName>('전체')

  // 타입 안전하게 카테고리 추출
  const categories: CategoryName[] = useMemo(
    () => [
      '전체',
      ...Array.from(
        new Set(
          (products ?? [])
            .map((p: Product) => (p.category ?? '').trim())
            .filter((cat: string): cat is CategoryName => 
              !!cat && cat.length > 0 && isValidCategory(cat)
            )
        )
      ) as CategoryName[],
    ],
    [products]
  )

  // ESC 누르면 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (loading) return null
  if (error) return <div className="text-center py-10">검색 정보를 불러오지 못했습니다.</div>

  // 검색 이벤트
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
      className="w-full max-w-md p-6 rounded-4xl shadow-lg relative modal-fade-in"
      style={{
        background: 'var(--background)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
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
