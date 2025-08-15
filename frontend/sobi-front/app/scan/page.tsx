// QR스캔 페이지

'use client';

import { useState } from 'react';
import { useRouter } from "next/navigation";
import { useBasketStore } from "@/store/useBasketStore";
import QrScannerComponent from '@/components/QrScanner';
import InputBasketNumberModal from '@/components/modals/InputBasketNumberModal';
import { motion } from 'framer-motion';

export default function ScanPage() {
  const router = useRouter();
  const setBasketId = useBasketStore(s => s.setBasketId);
  const setActivatedBasketId = useBasketStore(s => s.setActivatedBasketId);
  const [showInputModal, setShowInputModal] = useState(false);



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
      
      // 페이지 이동 - 히스토리 보존을 위해 push 사용
      router.push('/baskets');
      
    } catch (err) {
      console.error("QR 코드 파싱 실패:", err);
    }
  };

  // 장바구니 번호 입력 연결 핸들러
  const handleBasketNumberConnect = async (basketNumber: string) => {
    console.log("장바구니 번호 입력 연결:", basketNumber);
    
    try {
      // 입력된 번호로 데이터 생성
      const basketData = {
        basketId: basketNumber,
        boardMac: `manual-input-${basketNumber.padStart(3, '0')}`,
        timestamp: Date.now()
      };
      
      // 기존 QR 스캔 핸들러와 동일한 로직 사용
      await handleQrScannerScan(JSON.stringify(basketData));
      
    } catch (err) {
      console.error("장바구니 번호 입력 연결 실패:", err);
    }
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

        {/* 연결 도움말 */}
        <div className="mt-6 text-center">
          <motion.button
            onClick={() => setShowInputModal(true)}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--sobi-green)] transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            혹시 연결이 안되시나요?
          </motion.button>
        </div>


      </div>

      {/* 장바구니 번호 입력 모달 */}
      <InputBasketNumberModal
        isOpen={showInputModal}
        onClose={() => setShowInputModal(false)}
        onConnect={handleBasketNumberConnect}
      />
    </main>
  );
}
