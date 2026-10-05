// 엽쌤스쿨 쉬는시간 오락실 100 서비스 워커: 앱 설치(홈 화면에 추가)와 오프라인 열기를 돕는다.
const CACHE_VERSION = 'old-game-v5';
// 같은 주소(gmlduqzhd123-lab.github.io)의 다른 앱들과 저장소를 함께 쓰므로, 이 앱의 이전 캐시만 지운다.
const CACHE_PREFIX = 'old-game-v';
const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./ys-install.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
    "./icons/apple-touch-icon.png"
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

// 캐시 전략:
// 1) 웹폰트 CDN(Pretendard, Google Fonts): 캐시 우선 (오프라인에서도 글꼴 유지)
// 2) 앱 자체 파일: 네트워크 우선 (새 배포 즉시 반영) + 오프라인 시 캐시 폴백
self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    const isFont = url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
    const isSelf = url.origin === self.location.origin;

    if (!isSelf && !isFont) return;

    if (isFont) {
        // 웹폰트: 캐시 우선 (캐시에 있으면 즉시 반환, 없으면 받아와서 저장)
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request).then(response => {
                    if (response.ok || response.type === 'opaque') {
                        const copy = response.clone();
                        caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
                    }
                    return response;
                }).catch(() => cached);
            })
        );
        return;
    }

    // 사이트 파일: 새 버전을 먼저 받아 오고, 인터넷이 없으면 저장해 둔 것을 보여준다
    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
                }
                return response;
            })
            .catch(() => caches.match(request, { ignoreSearch: true })
                .then(cached => cached || (request.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
});
