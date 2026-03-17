// Firebase Configuration
// Replace these values with your Firebase project credentials
// Get them from: Firebase Console -> Project Settings -> Your Apps -> SDK setup and configuration

import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore, enableNetwork, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore with long-polling to avoid WebSocket issues
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

// Force Firestore online — prevents "client is offline" errors
enableNetwork(db).catch((err) => {
    console.warn('Firestore enableNetwork warning:', err);
});

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging (FCM) if supported
let messaging = null;
if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
        if (supported) {
            messaging = getMessaging(app);
        }
    }).catch((err) => {
        console.warn('FCM not supported in this browser:', err);
    });
}
export { messaging };

// Helper function to set persistence based on "Remember me" checkbox
export const setAuthPersistence = async (rememberMe) => {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
};

export default app;
