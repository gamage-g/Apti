const CACHE = 'engineiq-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

/* ── Push handler ─────────────────────────────────────────────── */
self.addEventListener('push', e => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'EngineIQ', {
      body:               data.body ?? 'Time to study.',
      icon:               '/favicon.svg',
      badge:              '/favicon.svg',
      tag:                'engineiq-reminder',
      requireInteraction: false,
    })
  );
});

/* ── Notification click: focus open tab or open new one ────────── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});
