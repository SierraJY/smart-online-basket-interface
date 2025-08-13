import { Product } from '@/types'
import { CategoryName } from '@/components/categoryIcons'

export type SortOption = 'id' | 'sales' | 'discount_rate' | 'price_high' | 'price_low'

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'id', label: '최신순' },
  { value: 'sales', label: '판매순' },
  { value: 'discount_rate', label: '할인율 높은순' },
  { value: 'price_high', label: '가격높은순' },
  { value: 'price_low', label: '가격낮은순' }
]

export function filterProducts(
  products: Product[],
  keyword: string,
  category: CategoryName | string,
  includeOutOfStock: boolean,
  includeBrandField: boolean
): Product[] {
  const key = keyword.trim().toLowerCase()
  const shouldFilterByCategory = category !== '전체'

  return products.filter((item) => {
    if (shouldFilterByCategory && item.category !== category) return false
    const haystack = [item.name, item.description, item.category]
      .concat(includeBrandField ? [item.brand || ''] : [])
      .join(' ')
      .toLowerCase()
    const match = key === '' ? true : haystack.includes(key)
    const stockOk = includeOutOfStock || item.stock > 0
    return match && stockOk
  })
}

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const sorted = [...products]
  switch (sort) {
    case 'id':
      return sorted.sort((a, b) => b.id - a.id)
    case 'sales':
      return sorted.sort((a, b) => (b.sales || 0) - (a.sales || 0))
    case 'discount_rate':
      return sorted.sort((a, b) => (b.discountRate || 0) - (a.discountRate || 0))
    case 'price_high':
      return sorted.sort((a, b) => b.price - a.price)
    case 'price_low':
      return sorted.sort((a, b) => a.price - b.price)
    default:
      return sorted
  }
}

export function paginateProducts<T>(items: T[], currentPage: number, perPage: number): { totalPages: number; pageItems: T[] } {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  const pageItems = items.slice((currentPage - 1) * perPage, currentPage * perPage)
  return { totalPages, pageItems }
}


