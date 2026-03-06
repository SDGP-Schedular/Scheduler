import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { saveSettings, getSettings } from '../../services/firestoreService';
import schedulerLogo from '../../assets/scheduler-logo.png';
import Toast from '../common/Toast';
import './ReminderSettings.css';

const ReminderSettings = ({ isModal = false, onClose }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState({
        dailyReminders: { enabled: true, time: '09:00' },
        breakReminders: { enabled: true, interval: '30' },
        sessionAlerts: { enabled: false, options: ['5_min'] },
        performanceNotifications: { enabled: true, options: ['weekly_summary'] },
        preferences: { sound: true, push: true, email: false },
        quietHours: { enabled: true, start: '22:00', end: '08:00' }
    });
    const [toast, setToast] = useState(null);

    // Load settings from backend
    useEffect(() => {
        const loadSettings = async () => {
            // Check cache first
            const cached = localStorage.getItem('userSettings');
            if (cached) {
                setSettings(JSON.parse(cached));
                setIsLoading(false);
            }

            if (auth.currentUser) {
                try {
                    const result = await getSettings(auth.currentUser.uid);
                    if (result.success && result.data) {
                        setSettings(prev => ({
                            ...prev,
                            ...result.data
                        }));
                        // Update cache
                        localStorage.setItem('userSettings', JSON.stringify(result.data));
                    }
                } catch (error) {
                    console.error('Failed to load settings:', error);
                }
            }
            setIsLoading(false);
        };

        loadSettings();
    }, []);

    // Save changes handler (Optimistic UI)
    const handleSave = async () => {
        // Optimistic UI: Don't wait for backend to show "Saved"
        // But do block repeated clicks lightly
        if (isSaving) return;

        setIsSaving(true);
        setToast({ message: 'Saving settings...', type: 'info' });

        // Update local cache immediately
        localStorage.setItem('userSettings', JSON.stringify(settings));

        if (auth.currentUser) {
            try {
                // Fire and forget (mostly) - we await it but we don't block the UI feel
                // In a true optimistic UI we might not even await, but for data safety we'll await 
                // but use a non-blocking toast.
                await saveSettings(auth.currentUser.uid, settings);
                setToast({ message: 'Settings saved successfully!', type: 'success' });
            } catch (error) {
                console.error('Failed to save settings:', error);
                setToast({ message: 'Failed to save to cloud. Settings saved locally.', type: 'error' });
            }
        } else {
            setToast({ message: 'Settings saved locally (sign in to sync).', type: 'success' });
        }

        setIsSaving(false);
    };

    // Helper to update deeply nested state
    const updateSetting = (category, key, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    };

    // Helper for array options (toggleable chips)
    const toggleOption = (category, option) => {
        setSettings(prev => {
            const currentOptions = prev[category].options || [];
            const newOptions = currentOptions.includes(option)
                ? currentOptions.filter(o => o !== option)
                : [...currentOptions, option];

            return {
                ...prev,
                [category]: {
                    ...prev[category],
                    options: newOptions
                }
            };
        });
    };

    const MainContent = () => (
        <main className={`settings-main ${isModal ? 'modal-mode' : ''}`}>
            <header className="settings-header">
                <div>
                    <h1>Smart Reminder Settings</h1>
                    <p>Customize your notification preferences</p>
                </div>
                <div className="header-actions">
                    <button className="save-btn" onClick={handleSave} disabled={isSaving}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                        </svg>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    {isModal && (
                        <button className="close-modal-btn" onClick={onClose} title="Close">
                            ×
                        </button>
                    )}
                </div>
            </header>

            <div className="settings-content">
                {/* Daily Reminders */}
                <div className="setting-card">
                    <div className="setting-header">
                        <div className="setting-icon blue">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                        <div className="setting-info">
                            <h3>Daily Reminders</h3>
                            <p>Get a daily summary of your tasks and goals at your preferred time</p>
                        </div>
                        <div
                            className={`toggle-switch ${settings.dailyReminders.enabled ? 'active' : ''}`}
                            onClick={() => updateSetting('dailyReminders', 'enabled', !settings.dailyReminders.enabled)}
                        ></div>
                    </div>
                    {settings.dailyReminders.enabled && (
                        <div className="setting-controls">
                            <div className="select-wrapper">
                                <span className="select-label">Delivery Time:</span>
                                <select
                                    className="custom-select"
                                    value={settings.dailyReminders.time}
                                    onChange={(e) => updateSetting('dailyReminders', 'time', e.target.value)}
                                >
                                    <option value="07:00">7:00 AM</option>
                                    <option value="08:00">8:00 AM</option>
                                    <option value="09:00">9:00 AM</option>
                                    <option value="10:00">10:00 AM</option>
                                    <option value="20:00">8:00 PM</option>
                                </select>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="select-arrow">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                        </div>
                    )}
                </div>

                {/* Break Reminders */}
                <div className="setting-card">
                    <div className="setting-header">
                        <div className="setting-icon green">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                                <line x1="6" y1="1" x2="6" y2="4" />
                                <line x1="10" y1="1" x2="10" y2="4" />
                                <line x1="14" y1="1" x2="14" y2="4" />
                            </svg>
                        </div>
                        <div className="setting-info">
                            <h3>Break Reminders</h3>
                            <p>Regular reminders to take breaks and stay refreshed throughout the day</p>
                        </div>
                        <div
                            className={`toggle-switch ${settings.breakReminders.enabled ? 'active' : ''}`}
                            onClick={() => updateSetting('breakReminders', 'enabled', !settings.breakReminders.enabled)}
                        ></div>
                    </div>
                    {settings.breakReminders.enabled && (
                        <div className="setting-controls">
                            <div className="select-wrapper">
                                <span className="select-label">Interval:</span>
                                <select
                                    className="custom-select"
                                    value={settings.breakReminders.interval}
                                    onChange={(e) => updateSetting('breakReminders', 'interval', e.target.value)}
                                >
                                    <option value="30">Every 30 minutes</option>
                                    <option value="45">Every 45 minutes</option>
                                    <option value="60">Every 1 hour</option>
                                    <option value="120">Every 2 hours</option>
                                </select>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="select-arrow">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                        </div>
                    )}
                </div>

                {/* Session Start Alerts */}
                <div className="setting-card">
                    <div className="setting-header">
                        <div className="setting-icon purple">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                        </div>
                        <div className="setting-info">
                            <h3>Session Start Alerts</h3>
                            <p>Get notified when it's time to start your scheduled work or study sessions</p>
                        </div>
                        <div
                            className={`toggle-switch ${settings.sessionAlerts.enabled ? 'active' : ''}`}
                            onClick={() => updateSetting('sessionAlerts', 'enabled', !settings.sessionAlerts.enabled)}
                        ></div>
                    </div>
                    {settings.sessionAlerts.enabled && (
                        <div className="setting-controls">
                            <div className="chips-container">
                                <div
                                    className={`chip purple ${settings.sessionAlerts.options.includes('5_min') ? 'selected' : ''}`}
                                    onClick={() => toggleOption('sessionAlerts', '5_min')}
                                >
                                    5 min before
                                </div>
                                <div
                                    className={`chip purple ${settings.sessionAlerts.options.includes('start_time') ? 'selected' : ''}`}
                                    onClick={() => toggleOption('sessionAlerts', 'start_time')}
                                >
                                    At start time
                                </div>
                                <div
                                    className={`chip purple ${settings.sessionAlerts.options.includes('15_min') ? 'selected' : ''}`}
                                    onClick={() => toggleOption('sessionAlerts', '15_min')}
                                >
                                    15 min before
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Performance Notifications */}
                <div className="setting-card">
                    <div className="setting-header">
                        <div className="setting-icon orange">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                <path d="M4 22h16" />
                                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
                            </svg>
                        </div>
                        <div className="setting-info">
                            <h3>Performance Notifications</h3>
                            <p>Receive updates about your achievements, streaks, and productivity insights</p>
                        </div>
                        <div
                            className={`toggle-switch ${settings.performanceNotifications.enabled ? 'active' : ''}`}
                            onClick={() => updateSetting('performanceNotifications', 'enabled', !settings.performanceNotifications.enabled)}
                        ></div>
                    </div>
                    {settings.performanceNotifications.enabled && (
                        <div className="setting-controls">
                            <div className="chips-container">
                                <div
                                    className={`chip orange ${settings.performanceNotifications.options.includes('weekly_summary') ? 'selected' : ''}`}
                                    onClick={() => toggleOption('performanceNotifications', 'weekly_summary')}
                                >
                                    Weekly summary
                                </div>
                                <div
                                    className={`chip orange ${settings.performanceNotifications.options.includes('milestone_alerts') ? 'selected' : ''}`}
                                    onClick={() => toggleOption('performanceNotifications', 'milestone_alerts')}
                                >
                                    Milestone alerts
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notification Preferences */}
                <div className="setting-card">
                    <div className="setting-header">
                        <div className="setting-info">
                            <h3>Notification Preferences</h3>
                        </div>
                    </div>
                    <div className="pref-list">
                        <div className="pref-item">
                            <div className="pref-label">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                </svg>
                                Sound Alerts
                            </div>
                            <div
                                className={`toggle-switch ${settings.preferences.sound ? 'active' : ''}`}
                                onClick={() => updateSetting('preferences', 'sound', !settings.preferences.sound)}
                            ></div>
                        </div>
                        <div className="pref-item">
                            <div className="pref-label">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                    <line x1="12" y1="18" x2="12.01" y2="18" />
                                </svg>
                                Push Notifications
                            </div>
                            <div
                                className={`toggle-switch ${settings.preferences.push ? 'active' : ''}`}
                                onClick={() => updateSetting('preferences', 'push', !settings.preferences.push)}
                            ></div>
                        </div>
                        <div className="pref-item">
                            <div className="pref-label">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                                Email Notifications
                            </div>
                            <div
                                className={`toggle-switch ${settings.preferences.email ? 'active' : ''}`}
                                onClick={() => updateSetting('preferences', 'email', !settings.preferences.email)}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Quiet Hours */}
                <div className="setting-card">
                    <div className="setting-header">
                        <div className="setting-icon dark">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        </div>
                        <div className="setting-info">
                            <h3>Quiet Hours</h3>
                            <p>Set a time range when you don't want to receive any notifications</p>
                        </div>
                        <div
                            className={`toggle-switch ${settings.quietHours.enabled ? 'active' : ''}`}
                            onClick={() => updateSetting('quietHours', 'enabled', !settings.quietHours.enabled)}
                        ></div>
                    </div>
                    {settings.quietHours.enabled && (
                        <div className="time-range-controls">
                            <div className="time-input-group">
                                <label>From:</label>
                                <input
                                    type="time"
                                    className="time-input"
                                    value={settings.quietHours.start}
                                    onChange={(e) => updateSetting('quietHours', 'start', e.target.value)}
                                />
                            </div>
                            <div className="time-input-group">
                                <label>To:</label>
                                <input
                                    type="time"
                                    className="time-input"
                                    value={settings.quietHours.end}
                                    onChange={(e) => updateSetting('quietHours', 'end', e.target.value)}
                                />
                            </div>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="quiet-icon">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {/* We reuse the same toggle switch to match the design's "active" state indication or just keep it simple */}
                            <div className={`toggle-switch small ${settings.quietHours.enabled ? 'active' : ''}`} style={{ width: '36px', height: '20px' }}></div>
                        </div>
                    )}
                </div>

            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </main>
    );

    if (isModal) {
        return (
            <div className="settings-modal-wrapper">
                <MainContent />
            </div>
        );
    }

    return (
        <div className="settings-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <img src={schedulerLogo} alt="Scheduler" className="sidebar-logo-img" />
                </div>

                <nav className="sidebar-nav">
                    <button className="nav-item" onClick={() => navigate('/dashboard')} title="Dashboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <polyline points="9,22 9,12 15,12 15,22" />
                        </svg>
                    </button>
                    <button className="nav-item" onClick={() => navigate('/study-plan')} title="Study Plan">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                    </button>
                    <button className="nav-item" onClick={() => navigate('/analytics')} title="Analytics">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                    </button>
                    <button className="nav-item" onClick={() => navigate('/calendar')} title="Calendar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </button>
                    <button className="nav-item" onClick={() => navigate('/gamification')} title="Gamification">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
                            <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
                            <path d="M4 22h16" />
                            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                            <path d="M18 2H6v7a6 6 0 0012 0V2z" />
                        </svg>
                    </button>
                    <button className="nav-item" onClick={() => navigate('/ai-assistant')} title="AI Assistant">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44A2.5 2.5 0 015.5 17a2.5 2.5 0 01-1.94-4.06A2.5 2.5 0 015.5 9a2.5 2.5 0 011.5-4.56A2.5 2.5 0 019.5 2z" />
                            <path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44A2.5 2.5 0 0018.5 17a2.5 2.5 0 001.94-4.06A2.5 2.5 0 0018.5 9a2.5 2.5 0 00-1.5-4.56A2.5 2.5 0 0014.5 2z" />
                        </svg>
                    </button>
                    <button className="nav-item active" title="Settings">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                    </button>
                </nav>

                <div className="sidebar-bottom">
                    <div className="user-avatar">U</div>
                </div>
            </aside>

            {/* Main Content */}
            <MainContent />
        </div>
    );
};

export default ReminderSettings;
