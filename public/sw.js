// public/sw.js - Service Worker for handling push notifications

// Enhanced logging function that also sends logs to main thread
function debugLog(message, data = null) {
  console.log('[SW]', message, data);
  
  // Send debug info to main thread (optional)
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'SW_DEBUG',
        message: message,
        data: data,
        timestamp: new Date().toISOString()
      });
    });
  });
}

self.addEventListener('install', (event) => {
  debugLog('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  debugLog('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push events
self.addEventListener('push', (event) => {
  debugLog('Push message received:', event);
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
      debugLog('Parsed notification data:', notificationData);
    } catch (error) {
      debugLog('Error parsing push data:', error);
      notificationData = {
        title: 'New Notification',
        body: event.data.text() || 'You have a new message',
      };
    }
  } else {
    debugLog('No data in push event');
    notificationData = {
      title: 'New Notification',
      body: 'You have a new message',
    };
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: '/public/media/logos/jostech22.png',
    badge: '/public/media/logos/jostech22.png',
    tag: notificationData.tag || 'default-tag',
    data: notificationData.data || { url: '/' }, // Add default URL
    actions: notificationData.actions || [
      { action: 'view', title: 'View' },
      { action: 'close', title: 'Close' }
    ],
    requireInteraction: true,
    silent: false,
  };

  debugLog('Showing notification with options:', notificationOptions);

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
      .then(() => debugLog('Notification shown successfully'))
      .catch(error => debugLog('Error showing notification:', error))
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  debugLog('Notification clicked:', {
    action: event.action,
    notification: event.notification.title,
    data: event.notification.data
  });

  event.notification.close();

  // Get the URL from notification data
  const urlToOpen = event.notification.data?.url || '/';
  debugLog('URL to open:', urlToOpen);

  // Handle action buttons
  if (event.action === 'view') {
    debugLog('View action clicked');
    event.waitUntil(
      clients.openWindow(urlToOpen)
        .then(client => debugLog('Window opened:', client))
        .catch(error => debugLog('Error opening window:', error))
    );
  } else if (event.action === 'close') {
    debugLog('Close action clicked');
    return;
  } else {
    // Default action - open the app
    debugLog('Default click action');
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        debugLog('Found clients:', clientList.length);
        
        // // Check if app is already open with the target URL
        // for (const client of clientList) {
        //   if (client.url.includes(urlToOpen) && 'focus' in client) {
        //     debugLog('Focusing existing window:', client.url);
        //     return client.focus();
        //   }
        // }
        
        // // If app is not open, open it
        // if (clients.openWindow) {
          debugLog('Opening new window:', urlToOpen);
          return clients.openWindow(urlToOpen);
        // }
      }).catch(error => debugLog('Error in click handler:', error))
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  debugLog('Notification closed:', event.notification.title);
});

// Handle background sync (optional)
self.addEventListener('sync', (event) => {
  debugLog('Background sync:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background tasks here
      Promise.resolve().then(() => debugLog('Background sync completed'))
    );
  }
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  debugLog('Push subscription changed:', event);

  event.waitUntil(
    // Re-subscribe to push notifications
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      // You'll need to get the VAPID public key here
      // applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
    }).then((subscription) => {
      debugLog('New subscription created:', subscription);
      // Send new subscription to your server
      return fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });
    }).then(response => {
      debugLog('Subscription sent to server:', response.status);
    }).catch(error => {
      debugLog('Error resubscribing:', error);
    })
  );
});

// Global error handler
self.addEventListener('error', (event) => {
  debugLog('Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  debugLog('Unhandled Promise Rejection:', event.reason);
});