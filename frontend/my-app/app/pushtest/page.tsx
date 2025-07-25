'use client'
import React from 'react'

export default function PushTestButton() {
  const handlePush = async () => {
    // 브라우저 환경에서만 실행되도록
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('이 환경에서는 브라우저 알림을 지원하지 않습니다!')
      return
    }

    // 알림 권한 요청
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      alert('알림 권한이 허용되지 않았습니다!')
      return
    }

    // Service Worker 통한 알림 (가능할 때만)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        reg.showNotification('PWA 푸쉬 테스트', {
          body: '정상적으로 알림이 도착했어요!',
          icon: '/images/64.ico',
          badge: '/images/64.ico',
          tag: 'test-pwa-push',
        })
        return
      }
    }

    // (Fallback) 브라우저 직접 알림
    new window.Notification('PWA 푸쉬 테스트', {
      body: '정상적으로 알림이 도착했어요!',
      icon: '/images/64.ico',
    })
  }

  return (
    
    <button
      onClick={handlePush}
      style={{
        padding: '14px 28px',
        borderRadius: 24,
        fontWeight: 600,
        fontSize: 17,
        color: '#fff',
        background: 'linear-gradient(90deg,#2a6ef2,#17b585)',
        boxShadow: '0 3px 16px 0 rgba(80,90,140,0.11)',
        border: 'none',
        margin: '32px auto',
        display: 'block'
      }}
    >
      푸쉬알림 테스트
    </button>
    
  )
}
