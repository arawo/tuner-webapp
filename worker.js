const STATIC_DATA = [
    './',
    './favicon.ico',
    './css/app.css',
    './js/app.js'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open('cache_v2')
            .then(function (cache) {
                cache.addAll(STATIC_DATA);
            })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        })
    );
});
