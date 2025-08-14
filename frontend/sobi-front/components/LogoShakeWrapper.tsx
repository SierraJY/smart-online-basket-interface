// SOBI 로고 알파벳 흔들림 컴포넌트

import React, { useEffect, useState } from "react"

type LogoShakeWrapperProps = {
  children: React.ReactNode
  letter: 'S' | 'O' | 'B' | 'I'
}

export default function LogoShakeWrapper({ children, letter }: LogoShakeWrapperProps) {
  const [shaking, setShaking] = useState(false)

  useEffect(() => {
    // 각 알파벳별로 다른 흔들림 패턴 설정
    const shakeConfig = {
      S: { interval: 8000, duration: 200 }, // 8초마다, 0.2초 지속
      O: { interval: 10000, duration: 250 }, // 10초마다, 0.25초 지속
      B: { interval: 12000, duration: 300 }, // 12초마다, 0.3초 지속
      I: { interval: 9000, duration: 180 }   // 9초마다, 0.18초 지속
    }

    const config = shakeConfig[letter]
    let timeout: NodeJS.Timeout

    const shakeOnce = () => {
      setShaking(true)
      timeout = setTimeout(() => {
        setShaking(false)
        // 다음 흔들림까지 대기 (약간의 랜덤성 추가)
        const nextInterval = config.interval + Math.random() * 2000 - 1000 // ±1초 랜덤
        timeout = setTimeout(shakeOnce, nextInterval)
      }, config.duration)
    }

    // 초기 지연 후 시작 (각 알파벳이 동시에 흔들리지 않도록)
    const initialDelay = Math.random() * 3000 + 2000 // 2-5초 랜덤 지연
    timeout = setTimeout(shakeOnce, initialDelay)

    return () => clearTimeout(timeout)
  }, [letter])

  // 로고 전용 흔들림 스타일 (기존 기울기와 터치 반응과 충돌하지 않도록)
  const logoShakeStyle = shaking ? 'animate-logo-shake' : ''

  // motion.span을 직접 감싸지 않고 인라인 스타일로 적용
  return (
    <div 
      className={logoShakeStyle}
      style={{
        display: 'inline-block',
        transform: shaking ? 'translateX(0) translateY(0)' : 'none'
      }}
    >
      {children}
    </div>
  )
}
