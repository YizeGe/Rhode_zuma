const CACHE_NAME = 'rhode-zuma-v5';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './js/audio.js',
    './js/cannon.js',
    './js/game.js',
    './js/grid.js',
    './js/logic.js',
    './js/marble.js',
    './js/particles.js',
    './js/assests/red.png',
    './js/assests/blue.png',
    './js/assests/yellow.png',
    './js/assests/black.png',
    './js/assests/brown.png',
    './js/assests/green.png',
    './js/assests/bg_pattern.png',
    './icon.icns'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhiteList = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhiteList.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
