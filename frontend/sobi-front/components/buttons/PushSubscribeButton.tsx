'use client'
import { Bell } from "lucide-react"

export default function PushSubscribeButton() {
  const handleSubscribe = () => {
    alert('푸시 알림 기능이 현재 비활성화되어 있습니다.');
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
      }}>(비활성화됨)</span>
    </button>
  )
}