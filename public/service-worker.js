// service-worker.js — Web Push para Spendly PWA
// Registrado automáticamente cuando la app corre en el navegador

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Recibir una notificación push del servidor
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Spendly', body: event.data.text() };
  }

  const title = payload.title || 'Spendly';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon.png',
    badge: '/icon.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// El usuario hace clic en la notificación → abre la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, la enfoca
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        // Si no, abre una nueva
        return clients.openWindow('/');
      }),
  );
});
