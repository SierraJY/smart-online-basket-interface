import { useState, useRef, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"

interface SearchBarProps {
  keyword: string
  setKeyword: (v: string) => void
  category?: string
  setCategory?: (v: string) => void
  categories?: string[]
  onSearch: () => void
  showCategorySelect?: boolean // 카테고리 select 숨김여부
  showResultButton?: boolean
}

export default function SearchBar({
  keyword,
  setKeyword,
  category = '',
  setCategory,
  categories = [],
  onSearch,
  showCategorySelect = true,
  showResultButton = true,
}: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

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

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSearch() }}
      className="w-full max-w-md flex flex-col gap-4"
    >
      <div
        className="flex items-center w-full"
        style={{
          borderRadius: '999px',
          background: 'var(--modal-glass-bg,rgba(255,255,255,0.36))',
          border: '1.8px solid var(--modal-glass-border,rgba(85, 64, 64, 0.35))',
          boxShadow: '0 1.5px 10px 0 rgba(0,0,0,0.06)',
          backdropFilter: 'blur(9px)',
          WebkitBackdropFilter: 'blur(9px)',
          transition: 'background 0.4s, border 0.4s',
          position: 'relative'
        }}
      >
        {/* 검색 input */}
        <input
          type="text"
          placeholder="상품명을 입력하세요..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 px-5 py-3 text-sm bg-transparent focus:outline-none"
          style={{
            color: 'var(--foreground)',
            border: 'none',
          }}
          autoComplete="on"
        />

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
                    {categories.map((c) => (
                      <li
                        key={c}
                        onClick={() => { setCategory(c); setOpen(false); }}
                        style={{
                          padding: '11px 24px',
                          color: 'var(--text-secondary)',
                          background: c === category
                            ? 'rgba(0,0,0,0.06)'
                            : 'transparent',
                          cursor: 'pointer',
                          fontWeight: c === category ? 700 : 400,
                          transition: 'background 0.18s',
                          fontSize: 11,
                          letterSpacing: '-0.2px'
                        }}
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && (setCategory(c), setOpen(false))}
                      >
                        {c}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
      {showResultButton && (
         <button
        type="submit"
        className="rounded-xl py-3 text-sm font-semibold mt-1"
        style={{
          backgroundColor: 'var(--foreground)',
          color: 'var(--background)',
          boxShadow: '0 2px 12px 0 rgba(0,0,0,0.10)',
          transition: 'background 0.4s, color 0.4s',
        }}
      >
        검색
      </button>

      )}
     
    </form>
  )
}
