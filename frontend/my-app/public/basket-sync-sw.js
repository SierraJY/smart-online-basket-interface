// Service Worker for PWA Background Sync
const CACHE_NAME = 'basket-sync-v1';
const SSE_CACHE_KEY = 'basket-sse-data';

// Install event - 캐시 초기화
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker 설치됨');
  self.skipWaiting();
});

// Activate event - 이전 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker 활성화됨');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Background Sync 등록
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync 이벤트:', event.tag);
  
  if (event.tag === 'basket-sync') {
    event.waitUntil(syncBasketData());
  }
});

// 푸시 알림 처리
self.addEventListener('push', (event) => {
  console.log('[SW] 푸시 알림 수신:', event);
  
  const options = {
    body: '장바구니에 새로운 상품이 추가되었습니다!',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: '장바구니 보기',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/logo192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('스마트 장바구니', options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 알림 클릭:', event.action);
  
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/baskets')
    );
  }
});

// 메시지 처리 (클라이언트와 통신)
self.addEventListener('message', (event) => {
  console.log('[SW] 메시지 수신:', event.data);
  
  if (event.data.type === 'BASKET_UPDATE') {
    // 장바구니 데이터 업데이트 시 캐시에 저장
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.put(SSE_CACHE_KEY, new Response(JSON.stringify(event.data.basketData)));
      })
    );
    
    // 백그라운드 동기화 등록
    event.waitUntil(
      self.registration.sync.register('basket-sync')
    );
  }
});

// 백그라운드 동기화 함수
async function syncBasketData() {
  console.log('[SW] 백그라운드 동기화 시작');
  
  try {
    // 캐시된 장바구니 데이터 가져오기
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(SSE_CACHE_KEY);
    
    if (response) {
      const basketData = await response.json();
      console.log('[SW] 캐시된 장바구니 데이터:', basketData);
      
      // 모든 클라이언트에게 데이터 전송
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'BASKET_SYNC_UPDATE',
          basketData: basketData
        });
      });
    }
  } catch (error) {
    console.error('[SW] 백그라운드 동기화 실패:', error);
  }
}

// 네트워크 요청 가로채기 (SSE 연결 유지)
self.addEventListener('fetch', (event) => {
  // SSE 스트림 요청은 캐시하지 않음
  if (event.request.url.includes('/api/baskets/my/stream')) {
    console.log('[SW] SSE 스트림 요청 감지');
    return;
  }
  
  // 다른 API 요청들은 캐시 전략 적용 (GET 요청만 캐시)
  if (event.request.url.includes('/api/') && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 성공한 응답만 캐시
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // GET 요청만 캐시 (안전장치)
              if (event.request.method === 'GET') {
                cache.put(event.request, responseClone);
              }
            });
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 캐시된 응답 반환
          return caches.match(event.request);
        })
    );
  }
}); 