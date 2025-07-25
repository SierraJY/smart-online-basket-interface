importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB_hSrehJm1T66N8YbCFBUMky5VOQDvfio",
  authDomain: "test-70601.firebaseapp.com",
  projectId: "test-70601",
  storageBucket: "test-70601.firebasestorage.app",
  messagingSenderId: "299706912797",
  appId: "1:299706912797:web:2efb96f5762655728576f4",
  measurementId: "G-6E4GJMLPD9"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] 백그라운드 메시지: ', payload);

  // 커스텀 알림 띄우기 (옵션 변경 가능)
  const notificationTitle = payload.notification?.title || "백그라운드 푸쉬 알림!";
  const notificationOptions = {
    body: payload.notification?.body || JSON.stringify(payload),
    icon: './icons/256.png', // 프로젝트 아이콘 경로
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});