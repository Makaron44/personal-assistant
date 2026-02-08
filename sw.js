// ============================================
// Personal Assistant - Service Worker
// Version 2 - with update support
// ============================================

const APP_VERSION = '2.0.0';
const CACHE_NAME = `personal-assistant-v${APP_VERSION}`;
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './db.js',
    './manifest.json'
];

// Install event - cache assets
self.addEventListener('install', event => {
    console.log(`Service Worker v${APP_VERSION}: Installing...`);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('Service Worker: All files cached');
                // Skip waiting to activate immediately when user requests update
                return self.skipWaiting();
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    console.log(`Service Worker v${APP_VERSION}: Activating...`);

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cache => {
                        if (cache !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cache);
                            return caches.delete(cache);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Now active');
                // Take control of all clients immediately
                return self.clients.claim();
            })
    );
});

// Fetch event - network first for HTML, cache first for assets
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip external resources (like weather API)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        // For HTML pages, try network first
        event.request.mode === 'navigate'
            ? networkFirst(event.request)
            : cacheFirst(event.request)
    );
});

// Network first strategy (for HTML)
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || caches.match('./index.html');
    }
}

// Cache first strategy (for assets)
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return new Response('Offline', { status: 503 });
    }
}

// Handle messages from the app
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data === 'getVersion') {
        event.ports[0].postMessage({ version: APP_VERSION });
    }
});

// Background sync for future enhancements
self.addEventListener('sync', event => {
    console.log('Service Worker: Sync event', event.tag);
});

// Push notifications for future enhancements
self.addEventListener('push', event => {
    console.log('Service Worker: Push event', event);
});
