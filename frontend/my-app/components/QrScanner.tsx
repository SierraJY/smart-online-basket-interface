// app/components/QrScanner.tsx
'use client';
import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// QRScanner 컴포넌트
export default function QrScanner({ onScan }: {
  onScan: (text: string, stopCamera: () => Promise<void>) => void;
}) {
  const qrRef = useRef<HTMLDivElement>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const stoppedRef = useRef(false);

  // 카메라 중지 함수
  async function stopCamera() {
    stoppedRef.current = true;
    if (html5QrcodeRef.current) {
      try { await html5QrcodeRef.current.stop(); } catch {}
      try { await html5QrcodeRef.current.clear(); } catch {}
      html5QrcodeRef.current = null;
    }
  }

  useEffect(() => {
    if (!qrRef.current) return;
    const qrId = 'qr-reader';
    qrRef.current.id = qrId;
    const html5Qr = new Html5Qrcode(qrId);
    html5QrcodeRef.current = html5Qr;
    stoppedRef.current = false;

    html5Qr.start(
      { facingMode: 'environment' },
      { fps: 15, qrbox: 260 },
      async (decodedText) => {
        if (stoppedRef.current) return;
        stoppedRef.current = true;
        onScan(decodedText, stopCamera);
      },
      () => {}
  );

    return () => { stopCamera(); };
  }, [onScan]);

  return (
    <div style={{
      width: 270, height: 200, margin: "0 auto", overflow: "hidden",
      borderRadius: 18, boxShadow: "0 0 24px #0002"
    }}>
      <div ref={qrRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
