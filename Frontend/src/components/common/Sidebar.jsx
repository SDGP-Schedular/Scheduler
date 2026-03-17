import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useLanguage } from '../../i18n/LanguageContext';
import { clearFCMToken } from '../../services/notificationService';
import ConfirmLogoutModal from './ConfirmLogoutModal';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './Sidebar.css';

const Sidebar = ({ activeNav }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    // Use state + listener so avatar survives page refresh
    const [currentUser, setCurrentUser] = useState(auth.currentUser);
    const [cachedPhoto, setCachedPhoto] = useState(() => localStorage.getItem('userPhotoURL') || '');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user?.photoURL) {
                setCachedPhoto(user.photoURL);
                localStorage.setItem('userPhotoURL', user.photoURL);
            }
        });
        return () => unsubscribe();
    }, []);

    const userName = currentUser?.displayName || currentUser?.email || 'User';
    const photoURL = currentUser?.photoURL || cachedPhoto;

    const handleStudyPlanNavigation = () => {
        const plan = localStorage.getItem('studyPlan');
        navigate(plan ? '/study-plan' : '/scheduling');
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearFCMToken();
            [
                'userPhotoURL',
                'userProfile',
                'userProfileCache',
                'studyPlan',
                'appSettings'
            ].forEach((key) => localStorage.removeItem(key));
            navigate('/signin', { replace: true });
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img src={schedulerLogo} alt="Scheduler" className="sidebar-logo-img" />
            </div>

            <nav className="sidebar-nav">
                {/* Home/Dashboard */}
                <button
                    className={`nav-item ${activeNav === 'home' || activeNav === 'dashboard' ? 'active' : ''}`}
                    onClick={() => navigate('/dashboard')}
                    title={t('nav_dashboard')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <polyline points="9,22 9,12 15,12 15,22" />
                    </svg>
                </button>

                {/* Study Plan */}
                <button
                    className={`nav-item ${activeNav === 'schedule' || activeNav === 'study-plan' ? 'active' : ''}`}
                    onClick={handleStudyPlanNavigation}
                    title={t('nav_study_plan')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                </button>

                {/* Analytics */}
                <button
                    className={`nav-item ${activeNav === 'stats' || activeNav === 'analytics' ? 'active' : ''}`}
                    onClick={() => navigate('/analytics')}
                    title={t('nav_analytics')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                </button>

                {/* Calendar */}
                <button
                    className={`nav-item ${activeNav === 'calendar' ? 'active' : ''}`}
                    onClick={() => navigate('/calendar')}
                    title={t('nav_calendar')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                </button>

                {/* Gamification - Trophy Icon */}
                <button
                    className={`nav-item ${activeNav === 'gamification' ? 'active' : ''}`}
                    onClick={() => navigate('/gamification')}
                    title={t('nav_gamification')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0012 0V2z" />
                    </svg>
                </button>

                {/* AI Assistant - Brain Icon */}
                <button
                    className={`nav-item ${activeNav === 'ai' || activeNav === 'ai-assistant' ? 'active' : ''}`}
                    onClick={() => navigate('/ai-assistant')}
                    title={t('nav_ai_assistant')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44A2.5 2.5 0 015.5 17a2.5 2.5 0 01-1.94-4.06A2.5 2.5 0 015.5 9a2.5 2.5 0 011.5-4.56A2.5 2.5 0 019.5 2z" />
                        <path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44A2.5 2.5 0 0018.5 17a2.5 2.5 0 001.94-4.06A2.5 2.5 0 0018.5 9a2.5 2.5 0 00-1.5-4.56A2.5 2.5 0 0014.5 2z" />
                    </svg>
                </button>

                {/* Settings */}
                <button
                    className={`nav-item ${activeNav === 'settings' || activeNav === 'reminder-settings' ? 'active' : ''}`}
                    onClick={() => navigate('/settings')}
                    title={t('nav_settings')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                </button>
            </nav>

            <div className="sidebar-bottom">
                <button
                    className={`user-avatar-btn ${activeNav === 'profile' ? 'active' : ''}`}
                    onClick={() => navigate('/profile')}
                    title="Profile"
                >
                    {photoURL ? (
                        <img src={photoURL} alt="Profile" className="user-avatar-photo" />
                    ) : (
                        <span className="user-avatar-initial">
                            {userName.charAt(0).toUpperCase()}
                        </span>
                    )}
                </button>

                <button
                    className="logout-btn"
                    onClick={() => setShowLogoutConfirm(true)}
                    title={t('common_logout')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </button>
            </div>

            <ConfirmLogoutModal
                isOpen={showLogoutConfirm}
                onCancel={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                t={t}
            />
        </aside>
    );
};

export default Sidebar;
