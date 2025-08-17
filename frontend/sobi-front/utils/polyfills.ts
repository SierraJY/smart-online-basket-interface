// 클라이언트 사이드에서만 실행되는 polyfill
if (typeof window !== 'undefined') {
  // EventSource polyfill (IE 지원용)
  import('event-source-polyfill').then(() => {
    console.log('[Polyfill] EventSource polyfill 로드됨');
  }).catch((error) => {
    console.warn('[Polyfill] EventSource polyfill 로드 실패:', error);
  });
}

// 타입 선언
declare module 'event-source-polyfill'; 