const CACHE_NAME = 'dw-cache-v1';
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Dimensional Wellness AI', body: 'Time for a wellness check-in' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  // Set notification options based on type
  let options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
      notificationType: data.notificationType || 'general',
      taskData: data.taskData || null,
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  // Add specific actions for accountability notifications
  if (data.notificationType === 'pre_task') {
    options.actions = [
      { action: 'commit_yes', title: '✅ Yes, I\'ll do it' },
      { action: 'remind_later', title: '⏰ Remind me later' },
      { action: 'skip', title: '❌ Skip this time' }
    ];
  } else if (data.notificationType === 'post_task') {
    options.actions = [
      { action: 'completed', title: '✅ Yes, I did it!' },
      { action: 'partial', title: '🔄 Partially' },
      { action: 'skipped', title: '❌ No, I didn\'t' }
    ];
  } else if (data.notificationType === 'morning_briefing' || data.notificationType === 'evening_summary') {
    options.actions = [
      { action: 'open', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const notificationType = event.notification.data?.notificationType;
  const taskData = event.notification.data?.taskData;
  
  // Handle accountability notification actions
  if (notificationType === 'pre_task' || notificationType === 'post_task') {
    // Send response to the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Try to send message to existing client
          if (clientList.length > 0) {
            const client = clientList[0];
            client.postMessage({
              type: 'ACCOUNTABILITY_RESPONSE',
              notificationType,
              action,
              taskData
            });
            return client.focus();
          }
          
          // If no client exists, open the app and pass data via URL
          const responseData = encodeURIComponent(JSON.stringify({
            type: 'ACCOUNTABILITY_RESPONSE',
            notificationType,
            action,
            taskData
          }));
          return clients.openWindow(`/?notification_response=${responseData}`);
        })
    );
    return;
  }
  
  // Handle other notification types (dismiss, open)
  if (action === 'dismiss') return;
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then((c) => c.navigate(urlToOpen));
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});
