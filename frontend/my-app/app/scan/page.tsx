// QR스캔 페이지

'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBasketStore } from "@/store/useBasketStore";
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeScanType } from "html5-qrcode";
import { QrCode, Camera, Upload, ArrowLeft, RefreshCw, AlertCircle, TestTube, Bug } from 'lucide-react';

export default function ScanPage() {
  const router = useRouter();
  const setBasketId = useBasketStore(s => s.setBasketId);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileScannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'camera' | 'file'>('camera');
  const [shouldStartScan, setShouldStartScan] = useState(false);

  // QR 스캔 결과 콜백
  function onScanSuccess(decodedText: string) {
    console.log("QR 스캔 성공:", decodedText);
    
    try {
      // QR 코드에서 basketId 추출 (JSON 형식 또는 단순 문자열)
      let basketId: string;
      
      try {
        // JSON 형식인지 확인
        const parsed = JSON.parse(decodedText);
        basketId = parsed.basketId || parsed.id || decodedText;
      } catch {
        // 단순 문자열인 경우 그대로 사용
        basketId = decodedText;
      }
      
      console.log("추출된 basketId:", basketId);
      
      // 스캐너 정리
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      setIsScanning(false);
      
      // basketId 저장 및 페이지 이동
      setBasketId(basketId);
      localStorage.removeItem("activatedBasketId"); // 강제로 활성화 해제
      router.replace('/baskets');
      
    } catch (err) {
      console.error("QR 코드 파싱 실패:", err);
      setError("QR 코드 형식이 올바르지 않습니다.");
    }
  }

  // 스캔 에러 처리
  function onScanError(error: string) {
    console.log("QR 스캔 에러:", error);
    setError("스캔 중 오류가 발생했습니다. 다시 시도해주세요.");
  }

  // 카메라 스캔 시작
  const startCameraScan = () => {
    if (scannerRef.current) return;
    
    setError(null);
    setIsScanning(true);
    setShouldStartScan(true);
  };

  // 스캔 중지
  const stopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setShouldStartScan(false);
    setError(null);
  };

  // 파일 스캔 처리
  const handleFileUpload = async (file: File) => {
    if (!fileScannerRef.current) {
      fileScannerRef.current = new Html5Qrcode("file-reader");
    }
    
    setError(null);
    setIsScanning(true);
    
    try {
      const result = await fileScannerRef.current.scanFile(file, true);
      console.log("파일 스캔 성공:", result);
      onScanSuccess(result);
    } catch (err) {
      console.error("파일 스캔 실패:", err);
      setError("QR 코드를 찾을 수 없습니다. 다른 이미지를 시도해주세요.");
    } finally {
      setIsScanning(false);
    }
  };

  // 카메라 권한 확인
  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error("카메라 권한 확인 실패:", err);
      return false;
    }
  };

  // 스캐너 초기화 useEffect
  useEffect(() => {
    if (shouldStartScan && isScanning && scanMode === 'camera') {
      const element = document.getElementById("qr-reader");
      console.log("DOM 요소 확인:", element);
      
      if (element && !scannerRef.current) {
        // 카메라 권한 확인
        checkCameraPermission().then(hasPermission => {
          if (!hasPermission) {
            setError("카메라 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.");
            setIsScanning(false);
            setShouldStartScan(false);
            return;
          }

          try {
            console.log("스캐너 초기화 시작...");
            scannerRef.current = new Html5QrcodeScanner(
              "qr-reader",
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
              },
              false
            );

            console.log("스캐너 렌더링 시작...");
            scannerRef.current.render(onScanSuccess, onScanError);
            console.log("스캐너 렌더링 완료");
            setShouldStartScan(false);
          } catch (err) {
            console.error("스캐너 초기화 실패:", err);
            setError("카메라 접근에 실패했습니다. 브라우저 권한을 확인해주세요.");
            setIsScanning(false);
            setShouldStartScan(false);
          }
        });
      } else {
        console.log("DOM 요소가 없거나 스캐너가 이미 존재함");
      }
    }
  }, [shouldStartScan, isScanning, scanMode]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
      if (fileScannerRef.current) {
        fileScannerRef.current.stop();
      }
    };
  }, []);

  // 카메라 디버깅 정보
  const debugCamera = async () => {
    console.log("=== 카메라 디버깅 정보 ===");
    console.log("navigator.mediaDevices:", navigator.mediaDevices);
    console.log("getUserMedia 지원:", !!navigator.mediaDevices?.getUserMedia);
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log("사용 가능한 비디오 장치:", videoDevices);
    } catch (err) {
      console.error("장치 열거 실패:", err);
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("카메라 스트림 성공:", stream);
      stream.getTracks().forEach(track => {
        console.log("트랙 정보:", track.getSettings());
        track.stop();
      });
    } catch (err) {
      console.error("카메라 스트림 실패:", err);
    }
  };

  // 테스트용 QR 코드 생성 (개발용)
  const generateTestQR = () => {
    const testData = {
      basketId: "1",
      boardMac: "test-mac-001",
      timestamp: Date.now()
    };
    const qrData = JSON.stringify(testData);
    console.log("테스트 QR 데이터:", qrData);
    onScanSuccess(qrData);
  };

  return (
    <main className="min-h-screen px-4 py-10 pb-24 flex flex-col items-center"
      style={{ 
        background: 'var(--input-background)', 
        color: 'var(--foreground)',
        transition: 'background-color 1.6s, color 1.6s'
      }}
    >
      <div className="w-full max-w-4xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <QrCode className="w-8 h-8 text-green-600 mr-3" />
            <h1 className="text-3xl font-bold">QR 스캔</h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            장바구니 QR 코드를 스캔하여 연결하세요
          </p>
        </div>

        {/* 스캔 모드 선택 */}
        <div className="mb-8">
          <div className="flex gap-4 mb-6 justify-center">
            <button
              onClick={() => setScanMode('camera')}
              className={`px-8 py-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
                scanMode === 'camera' ? 'shadow-sm' : ''
              }`}
              style={{
                border: '1px solid var(--input-border)',
                backgroundColor: 'var(--input-background)',
                color: 'var(--foreground)',
              }}
            >
              <Camera className="w-6 h-6 mr-3" />
              카메라 스캔
            </button>
            <button
              onClick={() => setScanMode('file')}
              className={`px-8 py-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
                scanMode === 'file' ? 'shadow-sm' : ''
              }`}
              style={{
                border: '1px solid var(--input-border)',
                backgroundColor: 'var(--input-background)',
                color: 'var(--foreground)',
              }}
            >
              <Upload className="w-6 h-6 mr-3" />
              파일 업로드
            </button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--input-background)',
                border: '1px solid #ef4444',
              }}
            >
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                <p className="text-red-500 text-base">{error}</p>
              </div>
            </div>
          )}

          {/* 카메라 스캔 모드 */}
          {scanMode === 'camera' && (
            <div className="space-y-6">
              {!isScanning ? (
                <div className="text-center">
                  <button
                    onClick={startCameraScan}
                    className="px-12 py-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:opacity-80 mx-auto"
                    style={{
                      border: '1px solid var(--input-border)',
                      backgroundColor: 'var(--input-background)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <Camera className="w-8 h-8 mr-3" />
                    카메라로 QR 스캔 시작
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center p-6 rounded-lg"
                    style={{
                      backgroundColor: 'var(--input-background)',
                      border: '1px solid var(--input-border)',
                    }}
                  >
                    <div className="flex items-center justify-center mb-3">
                      <RefreshCw className="w-6 h-6 text-green-600 animate-spin mr-3" />
                      <span className="font-medium text-lg">카메라 초기화 중...</span>
                    </div>
                    <p className="text-base" style={{ color: 'var(--text-secondary)' }}>QR 코드를 카메라에 비춰주세요</p>
                  </div>
                  <div className="flex justify-center">
                    <div id="qr-reader" className="w-full max-w-md rounded-lg overflow-hidden"
                      style={{
                        backgroundColor: 'var(--input-background)',
                        border: '1px solid var(--input-border)',
                      }}
                    ></div>
                  </div>
                  <div className="text-center">
                    <button
                      onClick={stopScan}
                      className="px-8 py-4 rounded-lg font-medium transition-all duration-200 shadow-sm hover:opacity-80"
                      style={{
                        border: '1px solid var(--input-border)',
                        backgroundColor: 'var(--input-background)',
                        color: 'var(--foreground)',
                      }}
                    >
                      스캔 중지
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 파일 업로드 모드 */}
          {scanMode === 'file' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed rounded-lg p-8 text-center max-w-md mx-auto"
                style={{
                  borderColor: 'var(--input-border)',
                  backgroundColor: 'var(--input-background)',
                }}
              >
                <Upload className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <p className="font-medium text-lg mb-4">QR 코드 이미지를 선택하세요</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  className="block w-full text-base file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-base file:font-semibold transition-colors"
                  style={{
                    color: 'var(--text-secondary)',
                  }}
                />
              </div>
              {isScanning && (
                <div className="text-center p-6 rounded-lg max-w-md mx-auto"
                  style={{
                    backgroundColor: 'var(--input-background)',
                    border: '1px solid var(--input-border)',
                  }}
                >
                  <div className="flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-green-600 animate-spin mr-3" />
                    <span className="text-lg">QR 코드 스캔 중...</span>
                  </div>
                </div>
              )}
              <div id="file-reader" className="hidden"></div>
            </div>
          )}
        </div>

        {/* 개발용 테스트 버튼 */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide text-center" style={{ color: 'var(--text-secondary)' }}>개발자 도구</h3>
          <div className="flex gap-4 justify-center">
            <button
              onClick={generateTestQR}
              className="px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:opacity-80"
              style={{
                border: '1px solid var(--input-border)',
                backgroundColor: 'var(--input-background)',
                color: 'var(--foreground)',
              }}
            >
              <TestTube className="w-5 h-5 mr-2" />
              테스트 QR 스캔
            </button>
            <button
              onClick={debugCamera}
              className="px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:opacity-80"
              style={{
                border: '1px solid var(--input-border)',
                backgroundColor: 'var(--input-background)',
                color: 'var(--foreground)',
              }}
            >
              <Bug className="w-5 h-5 mr-2" />
              카메라 디버깅
            </button>
          </div>
        </div>

        {/* 뒤로가기 버튼 */}
        <div className="text-center">
          <button
            onClick={() => router.back()}
            className="px-8 py-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:opacity-80 mx-auto"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
              color: 'var(--foreground)',
            }}
          >
            <ArrowLeft className="w-6 h-6 mr-3" />
            뒤로가기
          </button>
        </div>
      </div>
    </main>
  );
}
