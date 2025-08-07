// 상품 랜덤 흔들림 컴포넌트

import React, { useEffect, useState } from "react"

type Product = {
  id: number | string
  stock: number
  [key: string]: any
}

type ShakeWrapperProps = {
  item: Product
  children: React.ReactNode
}

export default function ShakeWrapper({ item, children }: ShakeWrapperProps) {
  const [shaking, setShaking] = useState(false)

  useEffect(() => {
    if (!(item.stock > 0 && item.stock <= 30)) { // 흔들 애니메이션 기준 stock
      setShaking(false)
      return
    }
    let timeout: NodeJS.Timeout
    const shakeOnce = () => {
      setShaking(true)
      const shakeDuration = 350 + Math.random() * 300
      timeout = setTimeout(() => {
        setShaking(false)
        timeout = setTimeout(shakeOnce, 600 + Math.random() * 600)
      }, shakeDuration)
    }
    shakeOnce()
    return () => clearTimeout(timeout)
  }, [item.stock])

  // ⚡ 카드 스타일(크기, snap, flex 등)은 전부 부모에게 맡김!
  const cardStyle = `
    ${item.stock === 0 ? 'opacity-60 grayscale' : ''}
    ${shaking ? 'animate-shake-random' : ''}
  `

  return <div className={cardStyle}>{children}</div>
}