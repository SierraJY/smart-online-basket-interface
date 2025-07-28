'use client';

import QrScanner from '@/components/QrScanner';
import { useRouter } from 'next/navigation';

export default function Scan() {
  const router = useRouter();

  const handleScan = async (decodedText: string, stopCamera: () => Promise<void>) => {
    alert(`QR코드 인식 성공\n내용: ${decodedText}`);
    await stopCamera();
    router.push('/');
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)]">
      {/* 상단 고정 네비 */}
      <div className="w-full max-w-md flex items-center justify-between px-4 py-4">
        <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          QR 코드 스캔
        </h2>
        <span className="w-8">test</span>
      </div>
      {/* QR 카메라 영역 */}
      <section className="flex flex-col items-center mt-4 w-full">
        <QrScanner onScan={handleScan} />
        <div className="mt-4 text-center text-[16px] text-[var(--text-secondary)]">
          카메라에 QR 코드를 맞춰주세요
        </div>
      </section>
    </main>
  );
}
