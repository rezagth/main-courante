/* eslint-disable no-undef */
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

if (self.workbox) {
  const { precaching, routing, strategies, backgroundSync } = self.workbox;

  precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new strategies.NetworkFirst({ cacheName: 'pages-cache' }),
  );

  routing.registerRoute(
    ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
    new strategies.StaleWhileRevalidate({ cacheName: 'asset-cache' }),
  );

  const syncPlugin = new backgroundSync.BackgroundSyncPlugin('entries-sync-queue', {
    maxRetentionTime: 24 * 60,
  });

  routing.registerRoute(
    ({ url, request }) => request.method === 'POST' && url.pathname === '/api/entries/sync',
    new strategies.NetworkOnly({ plugins: [syncPlugin] }),
    'POST',
  );
}

self.addEventListener('sync', (event) => {
  if (event.tag !== 'manual-entries-sync') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'SYNC_PENDING_ENTRIES' }));
    }),
  );
});
