'use client';

import { useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';

// QRScanner Props 타입 정의
interface QrScannerProps {
  onScan: (text: string) => void;
}

// QRScanner 컴포넌트
export default function QrScannerComponent({ onScan }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const stoppedRef = useRef(false);

  // 카메라 중지 함수
  async function stopCamera() {
    console.log('[QrScanner] 카메라 중지 시작');
    stoppedRef.current = true;
    
    if (qrScannerRef.current) {
      try { 
        qrScannerRef.current.stop();
        console.log('[QrScanner] QR 스캐너 중지 완료');
      } catch (e) {
        console.log('[QrScanner] QR 스캐너 중지 중 에러:', e);
      }
      
      try { 
        qrScannerRef.current.destroy();
        console.log('[QrScanner] QR 스캐너 정리 완료');
      } catch (e) {
        console.log('[QrScanner] QR 스캐너 정리 중 에러:', e);
      }
      qrScannerRef.current = null;
    }
    
    // 추가로 모든 카메라 스트림 강제 중지
    try {
      const streams = await navigator.mediaDevices.getUserMedia({ video: true });
      streams.getTracks().forEach(track => {
        track.stop();
        console.log('[QrScanner] 추가 카메라 트랙 중지:', track.kind);
      });
    } catch (e) {
      console.log('[QrScanner] 추가 카메라 정리 중 에러:', e);
    }
  }

  useEffect(() => {
    if (!videoRef.current) return;
    
    console.log('[QrScanner] QR 스캐너 초기화 시작');
    stoppedRef.current = false;

    // QR 스캐너 인스턴스 생성
    const qrScanner = new QrScanner(
      videoRef.current,
      (result) => {
        if (stoppedRef.current) return;
        console.log('[QrScanner] QR 스캔 성공:', result.data);
        
        // 즉시 stopped 상태로 설정
        stoppedRef.current = true;
        
        // 즉시 카메라 중지
        stopCamera();
        
        // 콜백 호출
        onScan(result.data);
      },
      {
        onDecodeError: (error) => {
          // stopped 상태면 에러 무시
          if (stoppedRef.current) return;
          // 에러는 무시 (연속 스캔을 위해)
          console.log('[QrScanner] 스캔 에러 (무시):', error);
        },
        preferredCamera: 'environment',
        maxScansPerSecond: 10,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true
      }
    );

    qrScannerRef.current = qrScanner;

    // 스캔 시작
    qrScanner.start()
      .then(() => {
        console.log('[QrScanner] QR 스캐너 시작 완료');
      })
      .catch((error) => {
        console.error('[QrScanner] QR 스캐너 시작 실패:', error);
        
        // 상세한 에러 정보 출력
        if (error instanceof Error) {
          console.error('[QrScanner] 에러 상세 정보:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          
          // HTTPS 관련 에러 체크
          if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            console.error('[QrScanner] HTTPS가 아닌 환경에서 카메라 접근 시도');
          }
        }
      });

    // 컴포넌트 언마운트 시 정리
    return () => { 
      console.log('[QrScanner] 컴포넌트 언마운트 - 카메라 정리');
      stoppedRef.current = true;
      stopCamera(); 
    };
  }, [onScan]);

  return (
    <div style={{
      width: 270, height: 200, margin: "0 auto", overflow: "hidden",
      borderRadius: 18, boxShadow: "0 0 24px #0002",
      position: "relative"
    }}>
      <video 
        ref={videoRef}
        style={{ 
          width: "100%", 
          height: "100%",
          objectFit: "cover"
        }} 
      />
    </div>
  );
}
