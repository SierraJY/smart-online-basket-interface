// QR스캔 페이지

'use client';

import { useRouter } from "next/navigation";
import { useBasketStore } from "@/store/useBasketStore";
import QrScannerComponent from '@/components/QrScanner';
import { motion } from 'framer-motion';

export default function ScanPage() {
  const router = useRouter();
  const setBasketId = useBasketStore(s => s.setBasketId);
  const setActivatedBasketId = useBasketStore(s => s.setActivatedBasketId);



  // QrScanner용 핸들러
  const handleQrScannerScan = async (decodedText: string) => {
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
      
      // basketId 저장 및 활성화 상태 초기화(스토어 일원화)
      setBasketId(basketId);
      setActivatedBasketId(null);
      
      // 활성화 이후에 SSE가 연결되도록 스캔 단계에서는 연결을 보류
      console.log('[ScanPage] QR 스캔 성공 - SSE 연결은 활성화 이후에 수행');
      
      // 카메라 정리가 완료될 시간을 주기 위해 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 페이지 이동
      router.replace('/baskets');
      
    } catch (err) {
      console.error("QR 코드 파싱 실패:", err);
    }
  };

  // 테스트용 버튼 ('1' 전달)
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
        <div className="text-center mb-8">

        </div>





        {/* QrScanner 컴포넌트 - 카메라 프레임 */}
        <div className="flex flex-col items-center justify-center mb-6" style={{ minHeight: '60vh' }}>
          <QrScannerComponent onScan={handleQrScannerScan} />
          
          {/* 안내 문구 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-4 text-center"
          >
            <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
              SOBI에 있는 QR 코드를 스캔하여<br /> 편리한 쇼핑을 시작하세요!
            </p>
          </motion.div>
        </div>

        {/* 테스트용 버튼 - 작은 크기 */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={testScan}
            className="px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:opacity-80"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
              color: 'var(--foreground)',
            }}
          >
            테스트 장바구니 1번 연결
          </button>
        </div>
      </div>
    </main>
  );
}
