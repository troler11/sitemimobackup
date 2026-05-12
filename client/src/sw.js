const CACHE_NAME = 'mimo-frota-v1';

self.addEventListener('install', (event) => {
    // Instala e ativa imediatamente
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // Intercepta requisições (exigência mínima do PWA para celular aceitar)
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
