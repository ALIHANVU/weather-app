const CACHE_NAME = 'weather-now-cache-v1';
const urlsToCache = [
  '/weather-app/',
  '/weather-app/index.html',
  '/weather-app/base.css',
  '/weather-app/theme.css',
  '/weather-app/dark-theme.css',
  '/weather-app/main.js',
  '/weather-app/weather.js',
  '/weather-app/theme.js',
  '/weather-app/farmer_tips.json',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Открыт кэш');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Ошибка при открытии кэша:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          (response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.error('Ошибка при открытии кэша:', error);
              });
            return response;
          }
        );
      })
      .catch((error) => {
        console.error('Ошибка при обращении к кэшу:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
    .catch((error) => {
      console.error('Ошибка при активации:', error);
    })
  );
});
