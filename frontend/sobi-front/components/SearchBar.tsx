import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { BiSearchAlt2 } from "react-icons/bi"
import { CategoryName, isValidCategory } from "./categoryIcons"

// 검색바 Props 타입 정의
interface SearchBarProps {
  keyword: string
  setKeyword: (value: string) => void
  category?: CategoryName
  setCategory?: (value: CategoryName) => void
  categories?: readonly CategoryName[]
  onSearch: () => void
  showCategorySelect?: boolean // 카테고리 select 숨김여부
  showResultButton?: boolean
}

// 검색바 컴포넌트
export default function SearchBar({
  keyword,
  setKeyword,
  category = '전체',
  setCategory,
  categories = [],
  onSearch,
  showCategorySelect = true,
}: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // 카테고리 변경 핸들러
  const handleCategoryChange = (newCategory: string) => {
    if (isValidCategory(newCategory) && setCategory) {
      setCategory(newCategory)
      setOpen(false)
    }
  }

  // 키보드 이벤트 핸들러
  const handleKeyDown = (e: React.KeyboardEvent, cat: string) => {
    if (e.key === 'Enter') {
      handleCategoryChange(cat)
    }
  }

  // 외부 클릭 감지
  useEffect(() => {
    if (!open) return
    
    const handler = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyword.trim()) {
      const searchUrl = `/products/search?keyword=${encodeURIComponent(keyword.trim())}`
      router.push(searchUrl)
      return
    }
    onSearch()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md flex flex-col gap-4"
    >
      <div
        className="flex items-center w-full"
        style={{
          borderRadius: '999px',
          background: 'var(--modal-glass-bg,rgba(255,255,255,0.36))',
          border: isFocused 
            ? '1.8px solid var(--sobi-green)' 
            : '1.8px solid var(--modal-glass-border,rgba(85, 64, 64, 0.35))',
          boxShadow: '0 1.5px 10px 0 rgba(0,0,0,0.06)',
          backdropFilter: 'blur(9px)',
          WebkitBackdropFilter: 'blur(9px)',
          transition: 'background 0.4s, border 0.4s',
          position: 'relative'
        }}
      >
        {/* 검색 input */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="상품명을 입력하세요"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full px-5 py-3 pr-12 text-sm bg-transparent focus:outline-none"
            style={{
              color: 'var(--foreground)',
              border: 'none',
            }}
            autoComplete="on"
          />
          {/* 검색 버튼 */}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/10 transition-colors"
            style={{ color: 'var(--sobi-green)' }}
          >
            <BiSearchAlt2 size={18} />
          </button>
          {/* 점 애니메이션 - ProductDetailClient와 동일한 방식 */}
          {!keyword && (
            <div className="absolute left-28 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <span className="inline-block">
                <span className="animate-dots">.</span>
                <span className="animate-dots" style={{ animationDelay: '0.2s' }}>.</span>
                <span className="animate-dots" style={{ animationDelay: '0.4s' }}>.</span>
              </span>
            </div>
          )}
        </div>

        {showCategorySelect && !!setCategory && categories.length > 0 && (
          <>
            {/* 세로 구분선 */}
            <div
              className="h-8 w-px mx-0.5"
              style={{
                background: 'var(--modal-glass-border,rgba(255,255,255,0.18))',
                opacity: 0.4,
              }}
            />
            {/* 커스텀 드롭다운 */}
            <div ref={selectRef} className="relative flex-shrink-0 select-none" style={{ minWidth: 92 }}>
              <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center px-4 py-2 text-sm w-full bg-transparent focus:outline-none"
                style={{
                  color: 'var(--foreground)',
                  border: 'none',
                  fontWeight: 500,
                  borderRadius: 99,
                  background: 'transparent',
                  zIndex: 20
                }}
              >
                {category}
                <svg className="ml-2" width={14} height={14} viewBox="0 0 24 24"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
              </button>
              <AnimatePresence>
                {open && (
                  <motion.ul
                    key="dropdown"
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 2, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 left-0 mt-2 py-1 z-30"
                    style={{
                      borderRadius: 18,
                      background: document.documentElement.classList.contains('dark')
                        ? 'rgba(40,42,55,0.93)'
                        : 'rgba(245,245,250,0.92)',
                      color: 'var(--foreground)',
                      boxShadow: '0 4px 32px 0 rgba(0,0,0,0.11)',
                      border: '1.5px solid var(--input-border)',
                      overflow: 'hidden',
                      fontWeight: 500,
                    }}
                  >
                    {categories.map((cat) => (
                      <li
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        style={{
                          padding: '11px 24px',
                          color: 'var(--text-secondary)',
                          background: cat === category
                            ? 'rgba(0,0,0,0.06)'
                            : 'transparent',
                          cursor: 'pointer',
                          fontWeight: cat === category ? 700 : 400,
                          transition: 'background 0.18s',
                          fontSize: 11,
                          letterSpacing: '-0.2px'
                        }}
                        tabIndex={0}
                        onKeyDown={(e) => handleKeyDown(e, cat)}
                      >
                        {cat}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </form>
  )
}
