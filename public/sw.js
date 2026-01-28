// PWA 설치를 위한 최소한의 서비스 워커
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // 기본 네트워크 요청 처리 (오프라인 기능은 추후 고도화 가능)
  event.respondWith(fetch(event.request));
});