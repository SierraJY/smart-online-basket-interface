'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({
    onScan,
  }: {
    onScan: (text: string, stopCamera: () => Promise<void>) => void;
  }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const stoppedRef = useRef(false);
  const qrId = 'qr-reader';

  async function stopCamera() {
    stoppedRef.current = true;
    if (html5QrcodeRef.current) {
      try { await html5QrcodeRef.current.stop(); } catch {}
      try { await html5QrcodeRef.current.clear(); } catch {}
      html5QrcodeRef.current = null;
    }
  }

  useEffect(() => {
    if (html5QrcodeRef.current) {
      try { html5QrcodeRef.current.stop(); } catch {}
      try { html5QrcodeRef.current.clear(); } catch {}
      html5QrcodeRef.current = null;
    }

    if (!qrRef.current) return;

    qrRef.current.id = qrId;
    const html5Qr = new Html5Qrcode(qrId);
    html5QrcodeRef.current = html5Qr;
    stoppedRef.current = false;

    html5Qr.start(
      { facingMode: 'environment' } as any,
      { fps: 20, qrbox: 340 } as any,
      async (decodedText) => {
        if (stoppedRef.current) return;
        stoppedRef.current = true;

        // 이제 콜백에 stopCamera도 넘겨줌!
        onScan(decodedText, stopCamera);
      },
      // ...생략
    );

    return () => {
      stopCamera();
    };
  }, [onScan]);

  return (
    <div 
      style={{
        width: 340,
        height: 255,
        margin: "0 auto",
        overflow: "hidden",
        borderRadius: 18,
        boxShadow: "0 0 24px #0002"
      }}>
      <div ref={qrRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
