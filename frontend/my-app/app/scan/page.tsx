// QR스캔 페이지

'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBasketStore } from "@/store/useBasketStore";
import { Camera, CheckCircle, Play, TestTube } from 'lucide-react';
import QrScannerComponent from '@/components/QrScanner';

export default function ScanPage() {
  const router = useRouter();
  const setBasketId = useBasketStore(s => s.setBasketId);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);



  // QrScanner용 핸들러
  const handleQrScannerScan = (decodedText: string) => {
    console.log("QrScanner QR 스캔 성공:", decodedText);
    
    try {
      // QR 코드에서 basketId 추출
      let basketId: string;
      try {
        const parsed = JSON.parse(decodedText);
        basketId = parsed.basketId || parsed.id || decodedText;
      } catch {
        basketId = decodedText;
      }
      
      console.log("추출된 basketId:", basketId);
      
      // basketId 저장
      setBasketId(basketId);
      localStorage.removeItem("activatedBasketId");
      
      // 즉시 SSE 연결 시작 (활성화 전에 미리 연결)
      if (typeof window !== 'undefined' && (window as any).reconnectSSE) {
        console.log('[ScanPage] QR 스캔 성공 - 즉시 SSE 연결 시작');
        // 즉시 연결 (지연 없이)
        (window as any).reconnectSSE();
      }
      
      // 페이지 이동
      router.replace('/baskets');
      
    } catch (err) {
      console.error("QR 코드 파싱 실패:", err);
      setError("QR 코드 형식이 올바르지 않습니다.");
    }
  };

  // 1. 카메라 권한 확인
  const checkCameraPermission = async () => {
    setError(null);
    try {
      console.log("카메라 권한 확인 중...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      console.log("카메라 권한 확인 성공");
      setHasPermission(true);
    } catch (err) {
      console.error("카메라 권한 확인 실패:", err);
      setHasPermission(false);
      setError("카메라 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.");
    }
  };

  // 3. 테스트용 버튼 ('1' 전달)
  const testScan = () => {
    console.log("테스트 QR 스캔 실행");
    const testData = {
      basketId: "1",
      boardMac: "test-mac-001",
      timestamp: Date.now()
    };
    handleQrScannerScan(JSON.stringify(testData));
  };



  return (
    <main className="min-h-screen px-4 py-10 pb-24 flex flex-col items-center"
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}
    >
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-green-600 mr-3" />
            <h1 className="text-3xl font-bold">QR 스캔</h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            장바구니 QR 코드를 스캔하여 연결하세요
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--input-background)',
              border: '1px solid #ef4444',
            }}
          >
            <p className="text-red-500 text-base">{error}</p>
          </div>
        )}

        {/* 권한 상태 표시 */}
        {hasPermission !== null && (
          <div className="mb-6 p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--input-background)',
              border: '1px solid var(--input-border)',
            }}
          >
            <div className="flex items-center justify-center">
              {hasPermission ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-green-500">✅ 카메라 권한이 허용되었습니다</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 text-red-500 mr-3" />
                  <span className="text-red-500">❌ 카메라 권한이 거부되었습니다</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* 버튼들 */}
        <div className="space-y-4">
          {/* 1. 카메라 권한 확인 버튼 */}
          <button
            onClick={checkCameraPermission}
            className="w-full px-6 py-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:opacity-80"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
              color: 'var(--foreground)',
            }}
          >
            <Camera className="w-5 h-5 mr-3" />
            카메라 권한 확인
          </button>

          {/* 2. 테스트용 버튼 */}
          <button
            onClick={testScan}
            className="w-full px-6 py-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:opacity-80"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
              color: 'var(--foreground)',
            }}
          >
            <TestTube className="w-5 h-5 mr-3" />
            테스트 QR 스캔 ('1' 전달)
          </button>
        </div>

        {/* QrScanner 컴포넌트 - 카메라 프레임 */}
        <div className="mt-6">
          <QrScannerComponent onScan={handleQrScannerScan} />
        </div>
      </div>
    </main>
  );
}
