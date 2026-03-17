// Firebase Configuration
// Replace these values with your Firebase project credentials
// Get them from: Firebase Console -> Project Settings -> Your Apps -> SDK setup and configuration

import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore, enableNetwork, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyAEos1yWNEUzmJGs50y3yAUj28PnToFBZ4",
    authDomain: "scheduler-c6d30.firebaseapp.com",
    projectId: "scheduler-c6d30",
    storageBucket: "scheduler-c6d30.firebasestorage.app",
    messagingSenderId: "1073436054078",
    appId: "1:1073436054078:web:9d52e44b4d5e51b1fc776f"
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

// Helper function to set persistence based on "Remember me" checkbox
export const setAuthPersistence = async (rememberMe) => {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
};

export default app;
