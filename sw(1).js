// Service Worker desactivado
self.addEventListener('install', () => {
    console.log('SW: Desinstalando...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('SW: Limpiando...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('SW: Desactivado completamente');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Pass through
});
