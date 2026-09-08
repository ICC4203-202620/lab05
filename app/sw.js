const CACHE_PREFIX = 'distance-app-shell-';
const STATIC_CACHE = `${CACHE_PREFIX}v2`;
const CURRENT_CACHES = new Set([STATIC_CACHE]);

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './database.js',
  './app.js',
  './notifications.js',
  './register-sw.js',
  './app.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX))
          .filter((name) => !CURRENT_CACHES.has(name))
          .map((name) => caches.delete(name))
      )),
      self.clients.claim()
    ])
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, response.clone());
      } catch (error) {
        console.warn('No fue posible actualizar el app shell.', error);
      }
    }

    return response;
  } catch (error) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === 'navigate') {
      const cachedIndex = await cache.match('./index.html');

      if (cachedIndex) {
        return cachedIndex;
      }
    }

    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname.startsWith('/api/')
  ) {
    return;
  }

  event.respondWith(networkFirst(event.request));
});

self.addEventListener('push', (event) => {
  // TODO: interpretar el payload y presentar una notificación visible.
});

self.addEventListener('notificationclick', (event) => {
  // TODO: cerrar la notificación y abrir o reutilizar una ventana.
});
