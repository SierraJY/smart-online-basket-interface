'use client'

import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan }: { onScan: (text: string) => void }) {
  const qrRef = useRef<HTMLDivElement>(null)
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
  const stoppedRef = useRef(false)
  const qrId = 'qr-reader'

  useEffect(() => {
    if (html5QrcodeRef.current) {
      try { html5QrcodeRef.current.stop() } catch {}
      try { html5QrcodeRef.current.clear() } catch {}
      html5QrcodeRef.current = null
    }

    if (!qrRef.current) return

    qrRef.current.id = qrId
    const html5Qr = new Html5Qrcode(qrId)
    html5QrcodeRef.current = html5Qr
    stoppedRef.current = false

    html5Qr.start(
      { facingMode: 'environment' },
      { fps: 20, qrbox: 340 },
      (decodedText) => {
        console.log('QR 읽힘:', decodedText)
        alert(`QR코드 인식됨!\n내용: ${decodedText}`)
        if (stoppedRef.current) return
        stoppedRef.current = true
        
        onScan(decodedText)
        setTimeout(() => {
          try { html5Qr.stop() } catch {}
          try { html5Qr.clear() } catch {}
          html5QrcodeRef.current = null
        }, 100)
      },
      (errorMessage) => {
        // console.log('QR 인식실패:', errorMessage)
      }
    )

    return () => {
      stoppedRef.current = true
      if (html5QrcodeRef.current) {
        try { html5QrcodeRef.current.stop() } catch {}
        try { html5QrcodeRef.current.clear() } catch {}
        html5QrcodeRef.current = null
      }
    }
  }, [onScan])

  return (
    <div 
    style={{ width: 340, height: 255, margin: "0 auto", overflow: "hidden", borderRadius: 18, boxShadow: "0 0 24px #0002" }}>
      <div ref={qrRef} style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
