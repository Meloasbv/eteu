// Service Worker for push notifications
const scheduledTimeouts = {};

self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, delay } = event.data;
    
    // Cancel previous timeout for this id
    if (scheduledTimeouts[id]) {
      clearTimeout(scheduledTimeouts[id]);
    }

    scheduledTimeouts[id] = setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        vibrate: [200, 100, 200],
        tag: 'lembrete-' + id,
        requireInteraction: true,
      });
      delete scheduledTimeouts[id];
    }, delay);
  }

  if (event.data.type === 'CANCEL_NOTIFICATION') {
    const { id } = event.data;
    if (scheduledTimeouts[id]) {
      clearTimeout(scheduledTimeouts[id]);
      delete scheduledTimeouts[id];
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
