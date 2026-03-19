/**
 * Notification Service
 * Handles Firebase Cloud Messaging (FCM) setup, token registration, and foreground notifications
 */

import { messaging } from '../config/firebase';
import { onMessage } from 'firebase/messaging';
import { auth } from '../config/firebase';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://api.scheduler.it.com/api').replace(/\/$/, '');

/**
 * Request notification permission and get FCM token
 * @returns Promise with token or null if permission denied
 */
export const requestNotificationPermission = async () => {
    try {
        // Check if notification permission is already granted
        if (Notification.permission === 'granted') {
            return await getFCMToken();
        }

        // Request permission from user
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                return await getFCMToken();
            } else {
                console.log('Notification permission denied by user');
                return null;
            }
        } else {
            console.log('Notification permission previously denied');
            return null;
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return null;
    }
};

/**
 * Get the FCM token for the device
 * @returns Promise with token
 */
export const getFCMToken = async () => {
    try {
        if (!messaging) {
            console.warn('Firebase Messaging not available');
            return null;
        }

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.warn('VITE_FIREBASE_VAPID_KEY is not configured; skipping FCM token creation');
            return null;
        }

        const { getToken } = await import('firebase/messaging');
        let serviceWorkerRegistration;

        if ('serviceWorker' in navigator) {
            try {
                serviceWorkerRegistration = await navigator.serviceWorker.ready;
            } catch (swError) {
                console.warn('Service Worker not ready for FCM token request:', swError);
            }

            if (!serviceWorkerRegistration) {
                try {
                    const params = new URLSearchParams({
                        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
                        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
                        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
                        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
                        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
                        appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
                        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
                    });

                    const swUrl = `/sw.js?${params.toString()}`;
                    serviceWorkerRegistration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
                } catch (swRegisterError) {
                    console.warn('Failed to register service worker for FCM token request:', swRegisterError);
                }
            }
        }

        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration
        });

        if (token) {
            console.log('FCM Token:', token);
            // Store token in localStorage for later use
            localStorage.setItem('fcmToken', token);
            return token;
        } else {
            console.log('No FCM token available');
            return null;
        }
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
};

/**
 * Register FCM token with the backend
 * @param {string} token - The FCM token
 * @returns Promise with response
 */
export const registerFCMTokenWithBackend = async (token) => {
    try {
        if (!token || !auth.currentUser) {
            console.log('Missing token or user not authenticated');
            return { success: false };
        }

        const idToken = await auth.currentUser.getIdToken();

        const response = await fetch(`${API_BASE_URL}/notifications/register-device`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                fcmToken: token,
                deviceType: 'web',
                userAgent: navigator.userAgent
            })
        });

        let data = {};
        const raw = await response.text();
        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch (parseError) {
                console.warn('register-device returned non-JSON response:', raw);
            }
        }

        if (response.ok) {
            console.log('FCM token registered with backend');
            return { success: true, data };
        } else {
            console.error('Failed to register FCM token:', data);
            return { success: false, error: data.error || `HTTP ${response.status}` };
        }
    } catch (error) {
        console.error('Error registering FCM token:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Setup foreground message listener
 * Handles messages when the app is in the foreground
 */
export const setupForegroundMessageListener = (toastCallback) => {
    try {
        if (!messaging) {
            console.warn('Firebase Messaging not available');
            return;
        }

        onMessage(messaging, (payload) => {
            console.log('[foreground] Message received:', payload);

            // Show notification as toast in the app
            const title = payload.notification?.title || 'Reminder';
            const body = payload.notification?.body || 'You have a notification';

            if (toastCallback) {
                toastCallback({
                    message: `${title}: ${body}`,
                    type: 'info'
                });
            }

            // Optionally show browser notification
            if (Notification.permission === 'granted') {
                new Notification(title, {
                    body: body,
                    icon: payload.notification?.image || '/scheduler-icon.png',
                    badge: '/scheduler-badge.png'
                });
            }
        });
    } catch (error) {
        console.error('Error setting up foreground message listener:', error);
    }
};

/**
 * Check if push notifications are supported in this browser
 * @returns boolean
 */
export const isPushNotificationSupported = () => {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
};

/**
 * Get stored FCM token
 * @returns string or null
 */
export const getStoredFCMToken = () => {
    return localStorage.getItem('fcmToken');
};

/**
 * Clear stored FCM token (for logout)
 */
export const clearFCMToken = () => {
    localStorage.removeItem('fcmToken');
};

/**
 * Initialize notifications system
 * Should be called when app loads and user is authenticated
 */
export const initializeNotifications = async (toastCallback) => {
    try {
        if (!isPushNotificationSupported()) {
            console.log('Push notifications not supported in this browser');
            return;
        }

        // Check if service worker is registered
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                console.log('Service Worker is ready:', registration);
            } catch (error) {
                console.warn('Service Worker ready check failed:', error);
            }
        }

        // Setup foreground message listener
        setupForegroundMessageListener(toastCallback);

        // Check if token already exists
        const existingToken = getStoredFCMToken();
        if (existingToken) {
            console.log('Using existing FCM token');
            const registerResult = await registerFCMTokenWithBackend(existingToken);
            if (registerResult.success) {
                return { success: true, token: existingToken };
            }
            console.warn('Stored FCM token could not be registered, requesting a new token');
        }

        // Request permission and get token
        const token = await requestNotificationPermission();
        if (token) {
            const result = await registerFCMTokenWithBackend(token);
            return result;
        } else {
            console.log('Notification permission not granted');
            return { success: false };
        }
    } catch (error) {
        console.error('Error initializing notifications:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send a test notification to the current user via backend endpoint
 * @returns Promise<{success: boolean, error?: string}>
 */
export const sendTestNotification = async () => {
    try {
        if (!auth.currentUser) {
            return { success: false, error: 'User not authenticated' };
        }

        // Ensure this device is registered before sending test push
        const initResult = await initializeNotifications();
        if (!initResult?.success) {
            return {
                success: false,
                error: initResult?.error || 'Device notification setup failed (permission/token/registration).'
            };
        }

        const idToken = await auth.currentUser.getIdToken();

        const response = await fetch(`${API_BASE_URL}/notifications/send-test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                title: 'Test Notification',
                body: '✅ Notifications are working correctly!'
            })
        });

        let data = {};
        const raw = await response.text();
        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch (parseError) {
                console.warn('send-test returned non-JSON response:', raw);
            }
        }

        if (!response.ok || !data.success) {
            return { success: false, error: data.error || `Request failed (HTTP ${response.status})` };
        }

        return { success: true };
    } catch (error) {
        console.error('Error sending test notification:', error);
        return { success: false, error: error.message };
    }
};
