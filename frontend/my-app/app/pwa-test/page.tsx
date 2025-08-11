'use client';

import { useEffect, useState } from 'react';
import { useBasketStore } from '@/store/useBasketStore';
import { Basket } from '@/types';

// 테스트용 장바구니 데이터 타입
interface TestBasketData {
  basketId: number;
  totalPrice: number;
  totalCount: number;
  items: Array<{
    epcPattern: string;
    quantity: number;
    product: {
      name: string;
      price: number;
    };
  }>;
}

export default function PWATestPage() {
  const [swStatus, setSwStatus] = useState<string>('확인 중...');
  const [notificationStatus, setNotificationStatus] = useState<string>('확인 중...');
  const [basketData, setBasketData] = useState<Basket | null>(null);
  const { basketData: storeBasketData } = useBasketStore();

  useEffect(() => {
    // 서비스 워커 상태 확인
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setSwStatus('서비스 워커 활성화됨');
        console.log('[PWA Test] 서비스 워커 등록:', registration);
      }).catch(() => {
        setSwStatus('서비스 워커 비활성화');
      });
    } else {
      setSwStatus('서비스 워커 미지원');
    }

    // 알림 권한 확인
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    } else {
      setNotificationStatus('알림 미지원');
    }

    // 장바구니 데이터 설정
    setBasketData(storeBasketData);
  }, [storeBasketData]);

  const testBackgroundSync = async () => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('basket-sync');
        alert('백그라운드 동기화 등록 성공!');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        alert('백그라운드 동기화 등록 실패: ' + errorMessage);
      }
    } else {
      alert('백그라운드 동기화를 지원하지 않습니다.');
    }
  };

  const testNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('PWA 테스트', {
        body: '백그라운드 동기화 테스트 알림입니다.',
        icon: '/logo192.png'
      });
    } else {
      alert('알림 권한이 필요합니다.');
    }
  };

  const testBasketUpdate = () => {
    if (typeof window !== 'undefined' && (window as { sendBasketUpdateToSW?: (basketData: TestBasketData) => void }).sendBasketUpdateToSW) {
      const testData: TestBasketData = {
        basketId: 1,
        totalPrice: 10000,
        totalCount: 2,
        items: [
          {
            epcPattern: "TEST",
            quantity: 2,
            product: {
              name: "테스트 상품",
              price: 5000
            }
          }
        ]
      };
      
      (window as any).sendBasketUpdateToSW(testData);
      alert('테스트 장바구니 데이터를 서비스 워커에 전송했습니다.');
    } else {
      alert('서비스 워커가 준비되지 않았습니다.');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-6">PWA 백그라운드 동기화 테스트</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">서비스 워커 상태</h2>
          <p className="text-sm">{swStatus}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">알림 권한</h2>
          <p className="text-sm">{notificationStatus}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">현재 장바구니 데이터</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(basketData, null, 2)}
          </pre>
        </div>

        <div className="space-y-2">
          <button
            onClick={testBackgroundSync}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            백그라운드 동기화 테스트
          </button>

          <button
            onClick={testNotification}
            className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
          >
            푸시 알림 테스트
          </button>

          <button
            onClick={testBasketUpdate}
            className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
          >
            장바구니 업데이트 테스트
          </button>
        </div>

        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-semibold mb-2">테스트 방법:</h3>
          <ol className="text-sm space-y-1">
            <li>1. PWA를 홈 화면에 설치</li>
            <li>2. 다른 앱으로 이동 (백그라운드로 전환)</li>
            <li>3. MQTT 메시지 전송</li>
            <li>4. PWA로 돌아와서 데이터 확인</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 