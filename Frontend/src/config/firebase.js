// Firebase Configuration
// Replace these values with your Firebase project credentials
// Get them from: Firebase Console -> Project Settings -> Your Apps -> SDK setup and configuration

import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Helper function to set persistence based on "Remember me" checkbox
export const setAuthPersistence = async (rememberMe) => {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
};

export default app;
