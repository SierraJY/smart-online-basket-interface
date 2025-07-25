'use client'
import { useState, useEffect, useRef } from 'react'
import { initializeApp } from "firebase/app"
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging"
import { firebaseConfig } from "@/firebase-config"
import { Bell } from "lucide-react"

export default function PushSubscribeButton() {
  const [, setToken] = useState('')
  const messagingRef = useRef<Messaging | null>(null)

  useEffect(() => {
    const app = initializeApp(firebaseConfig)
    const messaging = getMessaging(app)
    messagingRef.current = messaging
    const unsubscribe = onMessage(messaging, (payload) => {
      alert("포그라운드 푸쉬!\n" + JSON.stringify(payload))
    })
    return () => unsubscribe()
  }, [])

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator)) {
      alert('Service Worker 미지원 브라우저!')
      return
    }
    await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
    if (!registration) {
      alert('Service Worker 등록 실패!')
      return
    }
    const messaging = messagingRef.current
    if (!messaging) {
      alert('Messaging 인스턴스 없음!')
      return
    }
    const vapidKey = "BILSyMWlpLmzrQ6ucJp7Sa22cstcNdOU8T2fuYmL0nNqYe7gO0fMQK60j5QUe7IyE1l-0dpH520v0ivxahscqLw"
    try {
      const currentToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      })
      if (currentToken) {
        setToken(currentToken)
        alert('FCM 토큰 발급 성공!\n(이 토큰으로 서버에서 푸쉬 보낼 수 있음)')
        console.log('FCM 토큰:', currentToken)
      } else {
        alert('권한 거부 or 토큰 발급 실패!')
      }
    } catch (e: any) {
      alert('FCM 토큰 발급 오류: ' + e.message)
    }
  }

  return (
    <button
      onClick={handleSubscribe}
      className="
        flex items-center justify-center gap-2
        rounded-md w-full max-w-sm py-3 text-base font-semibold transition-all
        border hover:shadow
      "
      style={{
        border: '1.5px solid var(--input-border)',
        background: 'var(--input-background)',
        color: 'var(--foreground)',
        marginTop: 16,
        marginBottom: 4,
        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)',
        transition: 'background 0.2s, color 0.2s, box-shadow 0.2s'
      }}
    >
      <Bell size={20} color='var(--foreground)' strokeWidth={1.7} />
      푸쉬 알림 구독하기&nbsp;
      <span style={{
        fontWeight: 400,
        fontSize: 14,
        color: 'var(--text-secondary)'
      }}>(토큰 콘솔확인)</span>
    </button>
  )
}