import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { getStudyPlan, getProgress, getUserProfile, getPlanHistory, getAchievements, updateStudyStreak, saveProgress, getNotificationLogs } from '../../services/firestoreService';
import { useLanguage } from '../../i18n/LanguageContext';
import Sidebar from '../common/Sidebar';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    // 1. Initial State from Cache (Aggressive Caching for Performance)
    const [userName, setUserName] = useState(() => {
        // Check userProfileCache (saved by UserProfile component) for firstName
        const profileCache = localStorage.getItem('userProfileCache');
        if (profileCache) {
            const parsed = JSON.parse(profileCache);
            if (parsed.firstName) return parsed.firstName;
        }
        // Fallback to userProfile cache
        const cached = localStorage.getItem('userProfile');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.firstName) return parsed.firstName;
            if (parsed.displayName) return parsed.displayName;
        }
        return 'User';
    });
    const [studyPlan, setStudyPlan] = useState(() => {
        const cached = localStorage.getItem('studyPlan');
        return cached ? JSON.parse(cached) : null;
    });
    const [progress, setProgress] = useState(() => {
        // Check both keys - gamification key (set by QuizResults) takes priority
        const gamCached = localStorage.getItem('gamificationProgress');
        const cached = localStorage.getItem('progress');
        const data = gamCached ? JSON.parse(gamCached) : (cached ? JSON.parse(cached) : null);
        return data || { studyStreak: 0, xpPoints: 0, completedSessions: 0 };
    });
    const [achievements, setAchievements] = useState(() => {
        // Check both keys - gamification key (set by QuizResults) takes priority  
        const gamCached = localStorage.getItem('gamificationAchievements');
        const cached = localStorage.getItem('achievements');
        const data = gamCached ? JSON.parse(gamCached) : (cached ? JSON.parse(cached) : null);
        return data || [];
    });

    // Task completion state - user-driven, persisted per day
    const [completedTasks, setCompletedTasks] = useState(() => {
        const todayKey = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
        const cached = localStorage.getItem('completedTasks');
        if (cached) {
            const parsed = JSON.parse(cached);
            // Only use cached data if it's from today
            if (parsed.date === todayKey) return parsed.tasks;
        }
        return [];
    });

    // Immediate loading state decision
    const [isLoading, setIsLoading] = useState(!studyPlan);

    useEffect(() => {
        let isMounted = true;

        const loadData = async (userId) => {
            if (!userId) return;
            console.log('📊 Dashboard loadData starting for user:', userId);

            try {
                // Background Refresh - fetching all relevant data
                const [profileResult, planResult, progressResult, achievementsResult] = await Promise.all([
                    getUserProfile(userId),
                    getStudyPlan(userId),
                    getProgress(userId),
                    getAchievements(userId)
                ]);

                if (!isMounted) return;

                if (profileResult.success && profileResult.data) {
                    const name = profileResult.data.firstName || profileResult.data.displayName || 'User';
                    setUserName(name);
                    localStorage.setItem('userProfile', JSON.stringify(profileResult.data));
                }

                if (planResult.success) {
                    setStudyPlan(planResult.data);
                    if (planResult.data) {
                        localStorage.setItem('studyPlan', JSON.stringify(planResult.data));
                    } else {
                        localStorage.removeItem('studyPlan');
                    }
                }

                if (progressResult.success && progressResult.data) {
                    console.log('📊 Firestore progress data:', JSON.stringify(progressResult.data));
                    // Always write Firestore data to cache, merging with highest values
                    setProgress(prev => {
                        const fsData = progressResult.data;
                        const merged = {
                            ...prev,
                            ...fsData,
                            xpPoints: Math.max(prev.xpPoints || 0, fsData.xpPoints || 0),
                            studyStreak: Math.max(prev.studyStreak || 0, fsData.studyStreak || 0),
                            completedSessions: Math.max(prev.completedSessions || 0, fsData.completedSessions || 0)
                        };
                        // ALWAYS write to cache — even zeros — so the key exists
                        localStorage.setItem('progress', JSON.stringify(merged));
                        localStorage.setItem('gamificationProgress', JSON.stringify(merged));
                        return merged;
                    });
                }

                if (achievementsResult.success) {
                    console.log('🏅 Firestore achievements count:', (achievementsResult.data || []).length);
                    // Always update achievements — merge Firestore with existing cache
                    setAchievements(prev => {
                        const fsAchievements = achievementsResult.data || [];
                        if (fsAchievements.length === 0 && prev.length === 0) {
                            // Both empty — write empty array to cache so key exists
                            localStorage.setItem('achievements', '[]');
                            localStorage.setItem('gamificationAchievements', '[]');
                            return prev;
                        }
                        // Merge by unique ID
                        const existingIds = new Set(prev.map(a => a.id || a.badge || a.type));
                        const newFromFirestore = fsAchievements.filter(a => !existingIds.has(a.id || a.badge || a.type));
                        const merged = [...prev, ...newFromFirestore];
                        localStorage.setItem('achievements', JSON.stringify(merged));
                        localStorage.setItem('gamificationAchievements', JSON.stringify(merged));
                        return merged;
                    });
                }

                // Background preload history
                getPlanHistory(userId, 10).then(res => {
                    if (res.success) localStorage.setItem('planHistory', JSON.stringify(res.data));
                }).catch(e => console.error('History preload fail', e));

            } catch (error) {
                console.error("Error refreshing dashboard data:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        // Optimization: Start loading if user is already authenticated
        if (auth.currentUser) {
            loadData(auth.currentUser.uid);
        }

        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                // Only load if not already started by auth.currentUser check
                loadData(user.uid);
            } else {
                if (isMounted) setIsLoading(false);
                setStudyPlan(null);
                setUserName('User');
                setProgress({ studyStreak: 0, xpPoints: 0, completedSessions: 0 });
                setAchievements([]);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    // Memoize all derived data to prevent redundant calculations on every render
    const hasPlan = useMemo(() => !!studyPlan && studyPlan.subjects && studyPlan.subjects.length > 0, [studyPlan]);

    const stats = useMemo(() => {
        const totalTopics = hasPlan ? studyPlan.subjects.reduce((sum, s) => sum + (s.topics?.length || 1), 0) : 0;
        const topicsLeft = Math.max(0, totalTopics - completedTasks.length);
        return {
            studyStreak: progress.studyStreak || 0,
            hoursLeft: topicsLeft,
            tasksDone: progress.completedSessions || 0,
            xpPoints: progress.xpPoints || 0
        };
    }, [hasPlan, progress, studyPlan, completedTasks]);

    const getTimeSlots = (preferredTime) => {
        if (preferredTime === 'morning') return ['08:00 AM', '10:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'];
        if (preferredTime === 'afternoon') return ['02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM', '10:00 PM'];
        return ['06:00 PM', '08:00 PM', '10:00 PM', '11:00 PM', '12:00 AM'];
    };

    const todayTasks = useMemo(() => {
        if (!hasPlan) return [];
        const timeSlots = getTimeSlots(studyPlan.preferences?.preferredTime || 'morning');
        return studyPlan.subjects.slice(0, 5).map((subject, i) => ({
            id: i,
            subject: subject.name,
            topics: subject.topics?.slice(0, 2).join(', ') || 'General Study',
            time: timeSlots[i] || 'Flexible',
            status: completedTasks.includes(i) ? 'completed' : 'pending'
        }));
    }, [hasPlan, studyPlan, completedTasks]);

    const weeklyData = useMemo(() => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const currentDay = new Date().getDay(); // 0 is Sunday
        const weekIndex = currentDay === 0 ? 6 : currentDay - 1; // Align to Mon-Sun

        return days.map((day, i) => {
            const isActive = i <= weekIndex;
            // Use fixed values or progression instead of random for stability
            let hours = 0;
            if (i < weekIndex) hours = 3; // Mock historical value
            else if (i === weekIndex) hours = 2; // Current day active

            return {
                day,
                hours,
                active: isActive
            };
        });
    }, []);

    const upcomingSessions = useMemo(() => {
        if (!hasPlan) return [];
        const colors = ['blue', 'purple', 'pink'];
        const dayNames = ['FRI', 'SAT', 'MON', 'TUE', 'WED', 'THU', 'SUN'];

        return studyPlan.subjects.slice(0, 3).map((s, i) => {
            // Predict next session dates roughly
            const date = new Date();
            date.setDate(date.getDate() + (i + 1));

            return {
                id: i,
                day: dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1] || 'TBD',
                date: date.getDate(),
                subject: s.name,
                time: 'Check Schedule',
                color: colors[i % 3]
            };
        });
    }, [hasPlan, studyPlan]);

    const handleNotificationClick = async () => {
        if (!auth.currentUser) {
            alert('Please sign in to view notifications.');
            return;
        }

        const result = await getNotificationLogs(auth.currentUser.uid, 5);
        if (!result.success || !result.data || result.data.length === 0) {
            alert("No new notifications at this time. You're all caught up!");
            return;
        }

        const lines = result.data.map((item, index) => {
            const timeText = item.timestamp
                ? new Date(item.timestamp).toLocaleString()
                : 'Recent';
            return `${index + 1}. ${item.title || 'Notification'}\n   ${item.body || ''}\n   ${timeText}`;
        });

        alert(`Recent Notifications:\n\n${lines.join('\n\n')}`);
    };

    const handleToggleTask = (taskId) => {
        setCompletedTasks(prev => {
            const wasCompleted = prev.includes(taskId);
            const updated = wasCompleted
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId];
            // Persist to localStorage with today's date
            const todayKey = new Date().toISOString().slice(0, 10);
            localStorage.setItem('completedTasks', JSON.stringify({ date: todayKey, tasks: updated }));

            // When a task is newly completed, update streak and progress in Firestore + localStorage caches
            if (!wasCompleted && auth.currentUser) {
                updateStudyStreak(auth.currentUser.uid)
                    .then(result => {
                        if (result.success) {
                            const newStreak = result.streak;
                            setProgress(p => {
                                const updatedProgress = { ...p, studyStreak: newStreak };
                                // Keep localStorage caches in sync
                                localStorage.setItem('progress', JSON.stringify(updatedProgress));
                                localStorage.setItem('gamificationProgress', JSON.stringify(updatedProgress));
                                return updatedProgress;
                            });
                        }
                    })
                    .catch(e => console.error('Streak update error:', e));

                saveProgress(auth.currentUser.uid, { completedSessions: updated.length })
                    .then(() => {
                        setProgress(p => {
                            const updatedProgress = { ...p, completedSessions: updated.length };
                            localStorage.setItem('progress', JSON.stringify(updatedProgress));
                            localStorage.setItem('gamificationProgress', JSON.stringify(updatedProgress));
                            return updatedProgress;
                        });
                    })
                    .catch(e => console.error('Progress save error:', e));
            }

            return updated;
        });
    };

    // No blocking loading screen check here anymore
    // layout renders immediately with cached data or empty states

    return (
        <div className="dashboard-container">
            <Sidebar activeNav="dashboard" />
            <main className="main-content">
                <header className="dashboard-header">
                    <div className="header-left">
                        <h1>{t('dashboard_welcome')}, {userName}!</h1>
                        <p>{hasPlan ? t('dashboard_subtitle_plan') : t('dashboard_subtitle_no_plan')}</p>
                    </div>
                    <div className="header-right">
                        <button className="notification-btn" title={t('common_notifications')} onClick={handleNotificationClick}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                            <span className="notification-dot"></span>
                        </button>
                        <button className="ai-assistant-btn" onClick={() => navigate('/ai-assistant')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                                <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z" />
                                <path d="M12 8v4l3 3" />
                            </svg>
                            {t('nav_ai_assistant')}
                        </button>
                    </div>
                </header>

                <section className="stats-section">
                    <div className="stat-card">
                        <div className="stat-ring blue">
                            <svg viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#3B82F6" strokeWidth="3" strokeDasharray={`${Math.min(stats.studyStreak * 10, 94)} 94`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                            </svg>
                            <span className="ring-icon">⚡</span>
                            <span className="stat-badge green">{t('dashboard_streak')}</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">{t('dashboard_study_streak')}</span>
                            <span className="stat-value">{stats.studyStreak} {t('dashboard_days')}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-ring purple">
                            <svg viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeDasharray={`${Math.min(stats.hoursLeft * 5, 94)} 94`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                            </svg>
                            <span className="ring-icon">🕒</span>
                            <span className="stat-badge blue">{t('dashboard_left')}</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">{t('dashboard_topics_left')}</span>
                            <span className="stat-value">{stats.hoursLeft}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-ring green">
                            <svg viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray={`${Math.min((stats.tasksDone / 10) * 94, 94)} 94`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                            </svg>
                            <span className="ring-icon">✅</span>
                            <span className="stat-badge gray">{t('dashboard_done')}</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">{t('dashboard_tasks_done')}</span>
                            <span className="stat-value">{stats.tasksDone}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-ring yellow">
                            <svg viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#F59E0B" strokeWidth="3" strokeDasharray={`${Math.min((stats.xpPoints / 100) * 94, 94)} 94`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                            </svg>
                            <span className="ring-icon">⭐</span>
                            <span className="stat-badge purple">{t('dashboard_points')}</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">{t('dashboard_xp_points')}</span>
                            <span className="stat-value">{stats.xpPoints}</span>
                        </div>
                    </div>
                </section>

                <div className="middle-section">
                    <div className="tasks-panel">
                        <div className="panel-header">
                            <h2>{t('dashboard_todays_tasks')}</h2>
                            <button className="view-all-btn" onClick={() => navigate('/study-plan')}>{t('dashboard_view_all')}</button>
                        </div>
                        {hasPlan ? (
                            <div className="tasks-list">
                                {todayTasks.map((task) => (
                                    <div key={task.id} className="task-item" onClick={() => handleToggleTask(task.id)} style={{ cursor: 'pointer' }}>
                                        <div className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}>
                                            {task.status === 'completed' && (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="task-info">
                                            <span className="task-title">{task.subject}</span>
                                            <span className="task-meta">{task.topics} • {task.time}</span>
                                        </div>
                                        <span className={`task-status status-${task.status}`}>
                                            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📅</div>
                                <p>{t('dashboard_no_plan')}</p>
                                <Link to="/scheduling" className="setup-btn">{t('dashboard_create_plan')}</Link>
                            </div>
                        )}
                    </div>

                    <div className="progress-panel">
                        <div className="panel-header">
                            <h2>{t('dashboard_weekly_progress')}</h2>
                        </div>
                        {hasPlan ? (
                            <>
                                <div className="progress-overall">
                                    <span>{t('dashboard_goal_completion')}</span>
                                    <span className="progress-percent">{Math.min(100, Math.round((stats.tasksDone / 10) * 100))}%</span>
                                </div>
                                <div className="progress-bars">
                                    {weeklyData.map((d) => (
                                        <div key={d.day} className="progress-day">
                                            <span className="day-label">{d.day}</span>
                                            <div className="progress-bar-container">
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{ width: `${(d.hours / 6) * 100}%`, opacity: d.active ? 1 : 0.3 }}
                                                ></div>
                                            </div>
                                            <span className="hours-label">{d.hours}h</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="weekly-goal">
                                    <span>{t('dashboard_current_status')}</span>
                                    <span className="goal-value">{stats.tasksDone} / 10 {t('dashboard_sessions')}</span>
                                </div>
                            </>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📈</div>
                                <p>{t('dashboard_progress_empty')}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bottom-section">
                    <div className="sessions-panel">
                        <div className="panel-header">
                            <h2>{t('dashboard_upcoming')}</h2>
                            <button className="view-all-btn" onClick={() => navigate('/calendar')}>{t('dashboard_view_all')}</button>
                        </div>
                        {hasPlan && upcomingSessions.length > 0 ? (
                            <div className="sessions-list">
                                {upcomingSessions.map(session => (
                                    <div key={session.id} className="session-item">
                                        <div className={`session-date ${session.color}`}>
                                            <span className="session-day">{session.day}</span>
                                            <span className="session-date-num">{session.date}</span>
                                        </div>
                                        <div className="session-info">
                                            <span className="session-title">{session.subject}</span>
                                            <span className="session-time">{session.time}</span>
                                        </div>
                                        <div className="session-arrow">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>{t('dashboard_no_sessions')}</p>
                            </div>
                        )}
                    </div>

                    <div className="achievements-panel">
                        <div className="panel-header">
                            <h2>{t('dashboard_achievements')}</h2>
                        </div>
                        <div className="achievements-grid">
                            {/* Always show study plan milestones first, then quiz badges */}
                            {(() => {
                                const cards = [];

                                // Study Plan milestones (always present)
                                cards.push(
                                    <div key="streak" className="achievement-card">
                                        <span className="achievement-icon">🔥</span>
                                        <span className="achievement-title">{stats.studyStreak} Day Streak</span>
                                        <span className="achievement-subtitle">{stats.studyStreak >= 7 ? 'On fire!' : stats.studyStreak > 0 ? 'Keep it up!' : 'Start your streak!'}</span>
                                    </div>
                                );
                                cards.push(
                                    <div key="sessions" className="achievement-card">
                                        <span className="achievement-icon">📚</span>
                                        <span className="achievement-title">{stats.tasksDone} Sessions</span>
                                        <span className="achievement-subtitle">{stats.tasksDone >= 10 ? 'Study Pro!' : stats.tasksDone > 0 ? 'Good progress' : 'Take a quiz to start'}</span>
                                    </div>
                                );

                                // XP level milestone
                                const level = Math.floor(stats.xpPoints / 100) + 1;
                                const levelNames = ['Beginner', 'Learner', 'Student', 'Scholar', 'Expert', 'Master', 'Legend'];
                                const levelName = levelNames[Math.min(level - 1, levelNames.length - 1)];
                                cards.push(
                                    <div key="xp-level" className="achievement-card">
                                        <span className="achievement-icon">⭐</span>
                                        <span className="achievement-title">Level {level} — {levelName}</span>
                                        <span className="achievement-subtitle">{stats.xpPoints} XP earned</span>
                                    </div>
                                );

                                // Show quiz badges if any were earned
                                if (achievements.length > 0) {
                                    // Show the most recent earned badge
                                    const latest = achievements[achievements.length - 1];
                                    cards.push(
                                        <div key="latest-badge" className="achievement-card">
                                            <span className="achievement-icon">{latest.icon || '🏆'}</span>
                                            <span className="achievement-title">{latest.title || latest.badge || 'Badge'}</span>
                                            <span className="achievement-subtitle">🏅 Recently earned</span>
                                        </div>
                                    );
                                } else {
                                    // Plan status card
                                    cards.push(
                                        <div key="plan-status" className="achievement-card">
                                            <span className="achievement-icon">{hasPlan ? '✅' : '📋'}</span>
                                            <span className="achievement-title">{hasPlan ? 'Plan Active' : 'No Plan Yet'}</span>
                                            <span className="achievement-subtitle">{hasPlan ? `${studyPlan.subjects?.length || 0} subjects` : 'Create a plan!'}</span>
                                        </div>
                                    );
                                }

                                return cards;
                            })()}
                        </div>
                        {hasPlan && (
                            <div className="next-achievement">
                                <div className="next-achievement-info">
                                    <span>{t('dashboard_next_level')}</span>
                                    <strong>{stats.xpPoints < 100 ? '100 XP — Learner' : `${Math.ceil((stats.xpPoints + 1) / 100) * 100} XP`}</strong>
                                </div>
                                <div className="next-achievement-progress">
                                    <span className="progress-text">{stats.xpPoints % 100}%</span>
                                    <span className="progress-subtext">{t('dashboard_to_next_level')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;