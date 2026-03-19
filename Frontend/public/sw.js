/**
 * Service Worker for Firebase Cloud Messaging
 * Handles push notifications when the app is in the background
 */

// Import Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Read Firebase config from service worker URL query params
const swUrl = new URL(self.location.href);
const firebaseConfig = {
    apiKey: swUrl.searchParams.get('apiKey') || '',
    authDomain: swUrl.searchParams.get('authDomain') || '',
    projectId: swUrl.searchParams.get('projectId') || '',
    storageBucket: swUrl.searchParams.get('storageBucket') || '',
    messagingSenderId: swUrl.searchParams.get('messagingSenderId') || '',
    appId: swUrl.searchParams.get('appId') || '',
    measurementId: swUrl.searchParams.get('measurementId') || '',
};

const hasRequiredFirebaseConfig =
    !!firebaseConfig.apiKey &&
    !!firebaseConfig.projectId &&
    !!firebaseConfig.messagingSenderId &&
    !!firebaseConfig.appId;

if (hasRequiredFirebaseConfig) {
    try {
        firebase.initializeApp(firebaseConfig);
        const messaging = firebase.messaging();

        // Handle incoming push messages when the app is in the background
        messaging.onBackgroundMessage((payload) => {
            console.log('[sw.js] Received background message:', payload);

            const notificationTitle = payload.notification?.title || 'Scheduler Reminder';
            const notificationOptions = {
                body: payload.notification?.body || 'You have a new notification',
                icon: '/scheduler-icon.png',
                badge: '/scheduler-badge.png',
                tag: payload.notification?.tag || 'notification',
                data: payload.data || {},
                actions: [
                    {
                        action: 'open',
                        title: 'Open',
                        icon: '/open-icon.png'
                    },
                    {
                        action: 'close',
                        title: 'Close',
                        icon: '/close-icon.png'
                    }
                ]
            };

            self.registration.showNotification(notificationTitle, notificationOptions);
        });
    } catch (error) {
        console.error('[sw.js] Firebase initialization failed:', error);
    }
} else {
    console.warn('[sw.js] Firebase config missing required values; background messaging disabled.');
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[sw.js] Notification clicked:', event);

    if (event.action === 'close') {
        event.notification.close();
    } else {
        // Open the app or focus on it
        event.notification.close();

        // Find if the app window is already open
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                // Check if there's already a window/tab open with the target app
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If not, open a new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[sw.js] Notification closed:', event);
});

// Skip waiting - activate the new service worker immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});
