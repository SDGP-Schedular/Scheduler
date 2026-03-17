import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';
import { saveSettings, getSettings } from '../../services/firestoreService';
import { clearFCMToken, sendTestNotification } from '../../services/notificationService';
import { useLanguage } from '../../i18n/LanguageContext';
import Sidebar from '../common/Sidebar';
import ConfirmLogoutModal from '../common/ConfirmLogoutModal';
import './Settings.css';

const Settings = () => {
    const navigate = useNavigate();
    const { t, language, setLanguage } = useLanguage();
    const [toast, setToast] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Settings state
    const [settings, setSettings] = useState({
        notifications: {
            email: true,
            push: true,
            courseReminders: false,
            marketingUpdates: false,
        },
        appearance: {
            theme: localStorage.getItem('appTheme') || 'light',
        },
        language: localStorage.getItem('appLanguage') || 'English',
        linkedCalendars: {
            google: { connected: false, email: '' },
        },
        dataManagement: {
            autoBackup: true,
        },
    });

    // Apply theme on mount and when it changes
    useEffect(() => {
        const theme = settings.appearance.theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('appTheme', theme);
    }, [settings.appearance.theme]);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // 1. INSTANT: Load from localStorage cache immediately
        const cached = localStorage.getItem('appSettings');
        if (cached) {
            try {
                const parsedCache = JSON.parse(cached);
                const currentTheme = localStorage.getItem('appTheme') || 'light';
                if (parsedCache.appearance) {
                    parsedCache.appearance.theme = currentTheme;
                }
                setSettings(prev => ({ ...prev, ...parsedCache }));
            } catch (e) {
                console.warn('Failed to parse cached settings:', e);
            }
        }

        // 2. BACKGROUND: Fetch from Firestore without blocking UI
        getSettings(user.uid).then(result => {
            if (result.success && result.data) {
                const currentTheme = localStorage.getItem('appTheme') || 'light';
                const mergedData = {
                    ...result.data,
                    appearance: {
                        ...result.data.appearance,
                        theme: currentTheme,
                    },
                };
                setSettings(prev => ({ ...prev, ...mergedData }));
                localStorage.setItem('appSettings', JSON.stringify(mergedData));
            }
        }).catch(error => {
            console.error('Failed to load settings from cloud:', error);
        });
    }, []);

    const updateSetting = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value,
            },
        }));
    };

    const handleThemeChange = (theme) => {
        updateSetting('appearance', 'theme', theme);
        // Immediately sync to appSettings cache so it persists across navigation
        const cached = localStorage.getItem('appSettings');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (!parsed.appearance) parsed.appearance = {};
            parsed.appearance.theme = theme;
            localStorage.setItem('appSettings', JSON.stringify(parsed));
        }
    };

    const handleLanguageChange = (lang) => {
        setSettings(prev => ({ ...prev, language: lang }));
        setLanguage(lang);
        setToast({ message: `Language changed to ${lang}`, type: 'success' });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSaveAll = async () => {
        setSaving(true);
        setToast({ message: 'Saving settings...', type: 'info' });

        // Optimistic: save to localStorage immediately
        localStorage.setItem('appSettings', JSON.stringify(settings));

        try {
            const user = auth.currentUser;
            if (user) {
                await saveSettings(user.uid, settings);
                setToast({ message: 'All settings saved successfully!', type: 'success' });
            } else {
                setToast({ message: 'Settings saved locally (sign in to sync).', type: 'success' });
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            setToast({ message: 'Failed to save to cloud. Saved locally.', type: 'error' });
        } finally {
            setSaving(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleCancel = () => {
        navigate('/dashboard');
    };

    const handleSendTestNotification = async () => {
        setToast({ message: 'Sending test notification...', type: 'info' });
        const result = await sendTestNotification();

        if (result.success) {
            setToast({ message: 'Test notification sent! Check your browser notifications.', type: 'success' });
        } else {
            setToast({ message: `Test notification failed: ${result.error || 'Unknown error'}`, type: 'error' });
        }

        setTimeout(() => setToast(null), 3500);
    };

    const handleLogout = async () => {
        setShowLogoutConfirm(false);
        setToast({ message: 'Signing out...', type: 'info' });
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

    const handleConnectCalendar = (provider) => {
        // Placeholder for calendar integration
        if (provider === 'google') {
            setToast({ message: 'Google Calendar integration coming soon!', type: 'info' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const handleQuickLink = (action) => {
        if (action === 'password') {
            setToast({ message: 'Password change — check your email for a reset link.', type: 'info' });
            // Could trigger Firebase password reset email here
        } else if (action === 'privacy') {
            setToast({ message: 'Privacy & Security settings coming soon.', type: 'info' });
        } else if (action === 'help') {
            setToast({ message: 'Need help? Contact support@scheduler.app', type: 'info' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const handleClearData = () => {
        if (window.confirm('Are you sure you want to clear all local data? This will not affect your cloud data.')) {
            localStorage.clear();
            setToast({ message: 'Local data cleared successfully.', type: 'success' });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleExportData = () => {
        const data = {
            settings,
            exportedAt: new Date().toISOString(),
            version: '1.0',
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scheduler-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setToast({ message: 'Settings exported!', type: 'success' });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="settings-container">
            <Sidebar activeNav="settings" />
            <main className="settings-main">
                <header className="settings-header">
                    <div className="header-left">
                        <h1>{t('settings_title')}</h1>
                        <p>{t('settings_subtitle')}</p>
                    </div>
                    <div className="header-right">
                        <button className="header-test-btn" onClick={handleSendTestNotification} title="Send test notification">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                            <span>Test Push</span>
                        </button>
                        <button className="header-logout-btn" onClick={() => setShowLogoutConfirm(true)} title={t('common_logout')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            <span>{t('common_logout')}</span>
                        </button>
                        <button className="header-icon-btn" title={t('common_notifications')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                        </button>
                        <button className="header-icon-btn" title={t('common_search')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                        </button>
                    </div>
                </header>

                <div className="settings-content">
                    {/* ====== ROW 1: Notification Preferences + Quick Links ====== */}
                    <div className="settings-row two-col">
                        <div className="settings-card">
                            <div className="card-header">
                                <div className="card-icon notification-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                                    </svg>
                                </div>
                                <div>
                                    <h2>{t('settings_notifications')}</h2>
                                    <p>{t('settings_notifications_desc')}</p>
                                </div>
                            </div>

                            <div className="toggle-list">
                                <div className="toggle-item">
                                    <div className="toggle-info">
                                        <span className="toggle-label">{t('settings_email_notif')}</span>
                                        <span className="toggle-desc">{t('settings_email_notif_desc')}</span>
                                    </div>
                                    <button
                                        className={`toggle-switch ${settings.notifications.email ? 'active' : ''}`}
                                        onClick={() => updateSetting('notifications', 'email', !settings.notifications.email)}
                                    >
                                        <span className="toggle-knob" />
                                    </button>
                                </div>
                                <div className="toggle-item">
                                    <div className="toggle-info">
                                        <span className="toggle-label">{t('settings_push_notif')}</span>
                                        <span className="toggle-desc">{t('settings_push_notif_desc')}</span>
                                    </div>
                                    <button
                                        className={`toggle-switch ${settings.notifications.push ? 'active' : ''}`}
                                        onClick={() => updateSetting('notifications', 'push', !settings.notifications.push)}
                                    >
                                        <span className="toggle-knob" />
                                    </button>
                                </div>
                                <div className="toggle-item">
                                    <div className="toggle-info">
                                        <span className="toggle-label">{t('settings_course_reminders')}</span>
                                        <span className="toggle-desc">{t('settings_course_reminders_desc')}</span>
                                    </div>
                                    <button
                                        className={`toggle-switch ${settings.notifications.courseReminders ? 'active' : ''}`}
                                        onClick={() => updateSetting('notifications', 'courseReminders', !settings.notifications.courseReminders)}
                                    >
                                        <span className="toggle-knob" />
                                    </button>
                                </div>
                                <div className="toggle-item">
                                    <div className="toggle-info">
                                        <span className="toggle-label">{t('settings_marketing')}</span>
                                        <span className="toggle-desc">{t('settings_marketing_desc')}</span>
                                    </div>
                                    <button
                                        className={`toggle-switch ${settings.notifications.marketingUpdates ? 'active' : ''}`}
                                        onClick={() => updateSetting('notifications', 'marketingUpdates', !settings.notifications.marketingUpdates)}
                                    >
                                        <span className="toggle-knob" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="settings-card quick-links-card">
                            <div className="card-header">
                                <div className="card-icon quicklinks-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                                    </svg>
                                </div>
                                <div>
                                    <h2>{t('settings_quick_links')}</h2>
                                </div>
                            </div>
                            <div className="quick-links-list">
                                <button className="quick-link-item" onClick={() => handleQuickLink('password')}>
                                    <div className="quick-link-icon password">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" />
                                            <path d="M7 11V7a5 5 0 0110 0v4" />
                                        </svg>
                                    </div>
                                    <span>{t('settings_change_password')}</span>
                                    <svg className="quick-link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                                <button className="quick-link-item" onClick={() => handleQuickLink('privacy')}>
                                    <div className="quick-link-icon privacy">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                    </div>
                                    <span>{t('settings_privacy')}</span>
                                    <svg className="quick-link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                                <button className="quick-link-item" onClick={() => handleQuickLink('help')}>
                                    <div className="quick-link-icon help">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                    </div>
                                    <span>{t('settings_help')}</span>
                                    <svg className="quick-link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ====== ROW 2: Appearance + Language ====== */}
                    <div className="settings-row two-col">
                        <div className="settings-card">
                            <div className="card-header">
                                <div className="card-icon appearance-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="5" />
                                        <line x1="12" y1="1" x2="12" y2="3" />
                                        <line x1="12" y1="21" x2="12" y2="23" />
                                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                        <line x1="1" y1="12" x2="3" y2="12" />
                                        <line x1="21" y1="12" x2="23" y2="12" />
                                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                    </svg>
                                </div>
                                <div>
                                    <h2>{t('settings_appearance')}</h2>
                                    <p>{t('settings_appearance_desc')}</p>
                                </div>
                            </div>
                            <div className="theme-section">
                                <span className="theme-label">{t('settings_theme_mode')}</span>
                                <div className="theme-toggle">
                                    <button
                                        className={`theme-btn ${settings.appearance.theme === 'light' ? 'active' : ''}`}
                                        onClick={() => handleThemeChange('light')}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                            <circle cx="12" cy="12" r="5" />
                                            <line x1="12" y1="1" x2="12" y2="3" />
                                            <line x1="12" y1="21" x2="12" y2="23" />
                                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                            <line x1="1" y1="12" x2="3" y2="12" />
                                            <line x1="21" y1="12" x2="23" y2="12" />
                                        </svg>
                                        {t('settings_light')}
                                    </button>
                                    <button
                                        className={`theme-btn ${settings.appearance.theme === 'dark' ? 'active' : ''}`}
                                        onClick={() => handleThemeChange('dark')}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                                        </svg>
                                        {t('settings_dark')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="settings-card">
                            <div className="card-header">
                                <div className="card-icon language-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="2" y1="12" x2="22" y2="12" />
                                        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2>{t('settings_language')}</h2>
                                    <p>{t('settings_language_desc')}</p>
                                </div>
                            </div>
                            <div className="language-section">
                                <span className="language-label">{t('settings_display_language')}</span>
                                <select
                                    className="language-select"
                                    value={settings.language}
                                    onChange={(e) => handleLanguageChange(e.target.value)}
                                >
                                    <option value="English">English</option>
                                    <option value="Sinhala">සිංහල (Sinhala)</option>
                                    <option value="Tamil">தமிழ் (Tamil)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ====== ROW 3: Linked Calendars ====== */}
                    <div className="settings-row">
                        <div className="settings-card full-width">
                            <div className="card-header">
                                <div className="card-icon calendar-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                </div>
                                <div>
                                    <h2>{t('settings_linked_calendars')}</h2>
                                    <p>{t('settings_linked_calendars_desc')}</p>
                                </div>
                            </div>
                            <div className="calendars-list">
                                <div className="calendar-item">
                                    <div className="calendar-provider">
                                        <div className="provider-icon google">
                                            <svg viewBox="0 0 24 24" width="20" height="20">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                        </div>
                                        <div className="provider-info">
                                            <span className="provider-name">{t('settings_google_calendar')}</span>
                                            <span className="provider-status">
                                                {settings.linkedCalendars.google.connected
                                                    ? settings.linkedCalendars.google.email
                                                    : t('settings_not_connected')}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        className={`connect-btn ${settings.linkedCalendars.google.connected ? 'connected' : ''}`}
                                        onClick={() => handleConnectCalendar('google')}
                                    >
                                        {settings.linkedCalendars.google.connected ? (
                                            <>{t('settings_connected')} <span className="connected-dot">✓</span></>
                                        ) : t('settings_connect')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* ====== ROW 6: Data Management ====== */}
                    <div className="settings-row">
                        <div className="settings-card full-width">
                            <div className="card-header">
                                <div className="card-icon data-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                                    </svg>
                                </div>
                                <div>
                                    <h2>{t('settings_data_management')}</h2>
                                    <p>{t('settings_data_management_desc')}</p>
                                </div>
                            </div>
                            <div className="data-actions">
                                <div className="toggle-list">
                                    <div className="toggle-item">
                                        <div className="toggle-info">
                                            <span className="toggle-label">{t('settings_auto_backup')}</span>
                                            <span className="toggle-desc">{t('settings_auto_backup_desc')}</span>
                                        </div>
                                        <button
                                            className={`toggle-switch ${settings.dataManagement.autoBackup ? 'active' : ''}`}
                                            onClick={() => updateSetting('dataManagement', 'autoBackup', !settings.dataManagement.autoBackup)}
                                        >
                                            <span className="toggle-knob" />
                                        </button>
                                    </div>
                                </div>
                                <div className="data-buttons">
                                    <button className="data-btn export" onClick={handleExportData}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        {t('settings_export')}
                                    </button>
                                    <button className="data-btn clear" onClick={handleClearData}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                        </svg>
                                        {t('settings_clear_data')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ====== FOOTER ACTIONS ====== */}
                <div className="settings-footer">
                    <button className="cancel-btn" onClick={handleCancel}>{t('settings_cancel')}</button>
                    <button className="save-btn" onClick={handleSaveAll} disabled={saving}>
                        {saving ? t('settings_saving') : t('settings_save')}
                    </button>
                </div>
            </main>

            {/* Toast notification */}
            {toast && (
                <div className={`settings-toast ${toast.type}`}>
                    {toast.type === 'success' && '✅ '}
                    {toast.type === 'error' && '❌ '}
                    {toast.type === 'info' && 'ℹ️ '}
                    {toast.message}
                </div>
            )}

            <ConfirmLogoutModal
                isOpen={showLogoutConfirm}
                onCancel={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                t={t}
            />
        </div>
    );
};

export default Settings;
