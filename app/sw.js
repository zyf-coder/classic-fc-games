const CACHE_NAME = 'classic-fc-games-v1';
const urlsToCache = [
    './',
    './index.html',
    './css/mobile.css',
    './js/jquery-1.4.2.min.js',
    './js/nes.js',
    './js/utils.js',
    './js/cpu.js',
    './js/keyboard.js',
    './js/mappers.js',
    './js/papu.js',
    './js/ppu.js',
    './js/rom.js',
    './js/ui.js',
    './js/mobile-touch.js',
    './js/mobile-app.js',
    './js/dynamicaudio-min.js',
    './manifest.json'
];

// 安装 Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('缓存已打开');
                return cache.addAll(urlsToCache);
            })
    );
});

// 激活 Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});

// 拦截请求
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
    );
});
