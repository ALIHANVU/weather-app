const CACHE_NAME = 'weather-cache-v1';
const urlsToCache = [
    '/',
    '/styles.css',
    '/main.js',
    '/weather.js',
    '/theme.js',
    '/base.css',
    '/dark-theme.css',
    '/theme.css'
];

// Установка Service Worker
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                console.log('Открыт кэш');
                return cache.addAll(urlsToCache);
            })
    );
});

// Обработка запросов
self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request)
            .then(function (response) {
                if (response) {
                    return response; // Вернуть из кэша
                }
                return fetch(event.request); // Запрос к сети
            }
        )
    );
});

// Обновление кэша
self.addEventListener('activate', function (event) {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName); // Удаление старых кэшей
                    }
                })
            );
        })
    );
});
