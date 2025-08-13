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
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    
    console.log('[QrScanner] QR 스캐너 초기화 시작');
    stoppedRef.current = false;

    // ref 값을 안전하게 캡처
    const videoElement = videoRef.current;

    // 카메라 중지 함수 (useEffect 내부에서 정의하여 ref 값을 안전하게 캡처)
    async function stopCamera() {
      console.log('[QrScanner] 카메라 중지 시작');
      stoppedRef.current = true;
      
      // QR 스캐너 정리
      if (qrScannerRef.current) {
        try { 
          await qrScannerRef.current.stop();
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
      
      // 비디오 스트림 정리 (캡처된 videoElement 사용)
      if (videoElement) {
        try {
          const stream = videoElement.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => {
              track.stop();
              console.log('[QrScanner] 비디오 트랙 중지:', track.kind);
            });
          }
          videoElement.srcObject = null;
          console.log('[QrScanner] 비디오 스트림 정리 완료');
        } catch (e) {
          console.log('[QrScanner] 비디오 스트림 정리 중 에러:', e);
        }
      }
      
      console.log('[QrScanner] 카메라 정리 완료');
    }

    // QR 스캐너 인스턴스 생성
    const qrScannerInstance = new QrScanner(
      videoRef.current,
      async (result) => {
        if (stoppedRef.current) return;
        console.log('[QrScanner] QR 스캔 성공:', result.data);
        
        // 즉시 stopped 상태로 설정
        stoppedRef.current = true;
        
        try {
          // 카메라 중지 대기
          await stopCamera();
          console.log('[QrScanner] 카메라 중지 완료 후 콜백 호출');
          
          // 카메라 정리 완료 후 콜백 호출
          onScan(result.data);
        } catch (error) {
          console.error('[QrScanner] 카메라 정리 중 에러:', error);
          // 에러가 발생해도 콜백은 호출
          onScan(result.data);
        }
      },
      {
        onDecodeError: (error) => {
          // stopped 상태면 에러 무시
          if (stoppedRef.current) return;
          // 에러는 무시 (연속 스캔을 위해)
          console.log('[QrScanner] 스캔 에러 (무시):', error);
        },
        preferredCamera: 'environment',
        maxScansPerSecond: 5, // iOS에서 더 안정적
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true
      }
    );

    qrScannerRef.current = qrScannerInstance;

    // iOS Safari 호환성을 위한 지연된 시작
    const startScanner = async () => {
      try {
        // iOS에서 더 안정적인 시작을 위해 약간의 지연
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await qrScannerInstance.start();
        console.log('[QrScanner] QR 스캐너 시작 완료');
      } catch (error) {
        console.error('[QrScanner] QR 스캐너 시작 실패:', error);
        
        // 상세한 에러 정보 출력
        if (error instanceof Error) {
          console.error('[QrScanner] 에러 상세 정보:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          
          // iOS 특화 에러 체크
          if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            console.error('[QrScanner] iOS 환경에서 카메라 접근 실패');
            
            // iOS에서 후면 카메라 실패 시 전면 카메라로 재시도
            if (error.name === 'NotFoundError' || error.message.includes('camera')) {
              console.log('[QrScanner] iOS에서 전면 카메라로 재시도');
              try {
                await qrScannerInstance.setCamera('user');
                await qrScannerInstance.start();
                console.log('[QrScanner] 전면 카메라로 시작 성공');
              } catch (retryError) {
                console.error('[QrScanner] 전면 카메라 재시도도 실패:', retryError);
              }
            }
          }
          
          // HTTPS 관련 에러 체크
          if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            console.error('[QrScanner] HTTPS가 아닌 환경에서 카메라 접근 시도');
          }
        }
      }
    };

    startScanner();

    // 컴포넌트 언마운트 시 정리
    return () => { 
      console.log('[QrScanner] 컴포넌트 언마운트 - 카메라 정리');
      stoppedRef.current = true;
      
      // 기존 타임아웃 정리
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      
      // 언마운트 시에는 동기적으로 정리
      stopCamera().catch(error => {
        console.error('[QrScanner] 언마운트 시 카메라 정리 에러:', error);
      });
      
      // 추가 안전장치: 1초 후 강제 정리
      cleanupTimeoutRef.current = setTimeout(() => {
        console.log('[QrScanner] 강제 정리 실행');
        const videoElement = videoRef.current;
        if (videoElement) {
          const stream = videoElement.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          videoElement.srcObject = null;
        }
      }, 1000);
    };
  }, [onScan]);

  return (
    <div style={{
      width: 176, height: 176, margin: "0 auto", overflow: "hidden",
      borderRadius: "50%", boxShadow: "0 0 24px rgba(0,0,0,0.1)",
      position: "relative",
      border: "4px solid rgba(255,255,255,0.2)"
    }}>
      <video 
        ref={videoRef}
        playsInline={true}
        muted={true}
        autoPlay={false}
        style={{ 
          width: "100%", 
          height: "100%",
          objectFit: "cover",
          borderRadius: "50%"
        }} 
      />
    </div>
  );
}
