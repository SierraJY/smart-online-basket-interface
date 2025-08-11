'use client'

import { ReactNode, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function TransitionWrapper({ children }: { children: ReactNode }) {
  const [showChildren, setShowChildren] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setShowChildren(false)

    const timeout = setTimeout(() => {
      setShowChildren(true)
    }, 150) // 애니메이션 끝난 뒤 children 보이기

    return () => clearTimeout(timeout)
  }, [pathname])

  return (
    // overflow-hidden : y값을 정수를 줄 때 페이지 스크롤 생기는 문제 해결
    <div className="overflow-hidden">
      <motion.div
        className="backdrop-blur-md bg-white/80 rounded-xl shadow-lg"
        key={pathname}
        initial={{ y: 150, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{
          duration: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94], // 더 부드러운 이징
        }}
      >
        {showChildren ? children : null}
      </motion.div>
    </div>
  )
}

