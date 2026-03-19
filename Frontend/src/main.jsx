import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
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
            const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
            console.log('Service Worker registered successfully:', registration);
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
)
