import React, { useEffect, useState } from "react"

type Product = {
  id: number | string
  stock: number
  [key: string]: any // 필요시 확장
}

type ShakeWrapperProps = {
  item: Product
  children: React.ReactNode
}

export default function ShakeWrapper({ item, children }: ShakeWrapperProps) {
  const [shaking, setShaking] = useState(false)

  useEffect(() => {
    if (!(item.stock > 0 && item.stock < 50)) {
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

  const cardStyle = `
    item-card flex-shrink-0 w-[220px] h-[310px] snap-start rounded-3xl shadow-lg border border-neutral-100
    flex flex-col items-center px-3 pt-5 pb-4 transition-all relative
    ${item.stock === 0 ? 'opacity-60 grayscale pointer-events-none cursor-not-allowed' : ''}
    ${shaking ? 'animate-shake-random' : ''}
  `

  return <div className={cardStyle}>{children}</div>
}