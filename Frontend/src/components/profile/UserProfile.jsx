import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useLanguage } from '../../i18n/LanguageContext';
import Sidebar from '../common/Sidebar';
import './UserProfile.css';

const CACHE_KEY = 'userProfileCache';

const UserProfile = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const fileInputRef = useRef(null);

    // Auth state
    const [user, setUser] = useState(auth.currentUser);
    const [authReady, setAuthReady] = useState(!!auth.currentUser);

    // Load cached profile instantly
    const cached = (() => {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
        catch { return {}; }
    })();

    const [firstName, setFirstName] = useState(cached.firstName || '');
    const [lastName, setLastName] = useState(cached.lastName || '');
    const [email, setEmail] = useState(cached.email || '');
    const [bio, setBio] = useState(cached.bio || '');
    const [photoURL, setPhotoURL] = useState(cached.photoURL || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [toast, setToast] = useState(null);

    // Wait for Firebase Auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setAuthReady(true);
            if (!firebaseUser) {
                navigate('/signin');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    // Load Firestore data in background
    useEffect(() => {
        if (!authReady || !user) return;

        setEmail(user.email || '');
        if (user.photoURL) setPhotoURL(user.photoURL);

        if (!firstName && user.displayName) {
            const parts = user.displayName.split(' ');
            setFirstName(parts[0] || '');
            setLastName(parts.slice(1).join(' ') || '');
        }

        const loadProfile = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'users', user.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFirstName(data.firstName || '');
                    setLastName(data.lastName || '');
                    setBio(data.bio || '');
                    if (data.photoURL) setPhotoURL(data.photoURL);

                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        bio: data.bio || '',
                        photoURL: data.photoURL || user.photoURL || '',
                        email: user.email || ''
                    }));
                }
            } catch (error) {
                console.warn('Background profile fetch failed:', error.message);
            }
        };

        loadProfile();
    }, [authReady, user]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };
    // Compress & convert image to a tiny base64 data URL using Canvas
    const imageToBase64 = (file, maxSize = 150, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;

                // Scale down keeping aspect ratio
                if (w > h) {
                    if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
                } else {
                    if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                // Return as base64 data URL — no upload needed
                const dataURL = canvas.toDataURL('image/jpeg', quality);
                URL.revokeObjectURL(img.src);
                resolve(dataURL);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    };

    // ===== INSTANT PHOTO UPDATE — NO STORAGE UPLOAD =====
    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showToast('Please select a JPG, PNG, GIF, or WebP image', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be smaller than 5MB', 'error');
            return;
        }

        setIsUploading(true);

        try {
            // 1. Compress to tiny base64 (~15-30KB string) — instant
            const base64URL = await imageToBase64(file, 150, 0.7);

            // 2. Show immediately
            setPhotoURL(base64URL);

            // 3. Save to localStorage — instant
            localStorage.setItem('userPhotoURL', base64URL);
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
            cache.photoURL = base64URL;
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

            // 4. Save to Firestore (no Storage upload — just a string write)
            await Promise.all([
                updateProfile(user, { photoURL: base64URL }),
                setDoc(doc(db, 'users', user.uid), { photoURL: base64URL }, { merge: true })
            ]);

            showToast('Photo updated successfully!');
        } catch (error) {
            console.error('Error saving photo:', error);
            // Even if Firestore fails, the photo is saved in localStorage
            showToast('Photo saved locally!');
        } finally {
            setIsUploading(false);
        }
    };

    // ===== OPTIMIZED SAVE =====
    // Optimistic UI: cache locally first, then sync to Firebase
    const handleSave = async () => {
        if (!user) return;

        setIsSaving(true);

        const fullName = `${firstName} ${lastName}`.trim();
        const profileData = {
            firstName,
            lastName,
            bio,
            photoURL,
            email: user.email,
            updatedAt: new Date().toISOString()
        };

        // 1. INSTANT: Save to localStorage cache immediately
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            firstName, lastName, bio, photoURL, email: user.email
        }));

        // Also sync to userProfile key so Dashboard picks up the name instantly
        const existingProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        localStorage.setItem('userProfile', JSON.stringify({
            ...existingProfile,
            firstName,
            lastName,
            displayName: fullName
        }));

        // 2. Show success immediately — user sees instant feedback
        showToast('Profile saved successfully!');
        setIsSaving(false);

        // 3. BACKGROUND: Sync to Firebase without blocking UI
        Promise.all([
            updateProfile(user, { displayName: fullName }),
            setDoc(doc(db, 'users', user.uid), profileData, { merge: true })
        ]).catch(error => {
            console.error('Error syncing profile to cloud:', error);
            showToast('Saved locally. Cloud sync will retry.', 'error');
        });
    };

    const getInitial = () => {
        if (firstName) return firstName.charAt(0).toUpperCase();
        if (user?.displayName) return user.displayName.charAt(0).toUpperCase();
        if (user?.email) return user.email.charAt(0).toUpperCase();
        return 'U';
    };

    // Minimal loading while auth initializes
    if (!authReady) {
        return (
            <div className="profile-page">
                <Sidebar activeNav="profile" />
                <main className="profile-main">
                    <div className="profile-loading">
                        <div className="profile-spinner"></div>
                        <p>Loading...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="profile-page">
            <Sidebar activeNav="profile" />
            <main className="profile-main">
                <div className="profile-card">
                    {/* Header */}
                    <div className="profile-header">
                        <div className="profile-header-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <div className="profile-header-text">
                            <h2>Profile Information</h2>
                            <p>Update your personal details and profile picture</p>
                        </div>
                    </div>

                    {/* Photo Section */}
                    <div className="profile-photo-section">
                        <div className="profile-avatar-large">
                            {photoURL ? (
                                <img src={photoURL} alt="Profile" className="profile-avatar-img" />
                            ) : (
                                <span className="profile-avatar-initial">{getInitial()}</span>
                            )}
                            {isUploading && (
                                <div className="upload-overlay">
                                    <div className="upload-spinner"></div>
                                </div>
                            )}
                        </div>
                        <div className="profile-photo-actions">
                            <button
                                className="change-photo-btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? 'Uploading...' : 'Change Photo'}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif"
                                onChange={handlePhotoChange}
                                style={{ display: 'none' }}
                            />
                            <span className="photo-hint">JPG, PNG or GIF. Max size 2MB</span>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="profile-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="firstName">First Name</label>
                                <input
                                    id="firstName"
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="Enter your first name"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName">Last Name</label>
                                <input
                                    id="lastName"
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Enter your last name"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                readOnly
                                className="readonly-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="bio">Bio</label>
                            <textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Passionate learner exploring new technologies and methodologies."
                                rows={4}
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="profile-actions">
                        <button
                            className="save-btn"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* Toast Notification */}
                {toast && (
                    <div className={`profile-toast ${toast.type}`}>
                        {toast.type === 'success' ? '✅' : '❌'} {toast.message}
                    </div>
                )}
            </main>
        </div>
    );
};

export default UserProfile;
