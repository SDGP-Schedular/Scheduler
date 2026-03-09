import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { getStudyPlan, getProgress, getUserProfile, getPlanHistory, getAchievements } from '../../services/firestoreService';
import Sidebar from '../common/Sidebar';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();

    // 1. Initial State from Cache (Aggressive Caching for Performance)
    const [userName, setUserName] = useState(() => {
        const cached = localStorage.getItem('userProfile');
        return cached ? (JSON.parse(cached).displayName || 'User') : 'User';
    });
    const [studyPlan, setStudyPlan] = useState(() => {
        const cached = localStorage.getItem('studyPlan');
        return cached ? JSON.parse(cached) : null;
    });
    const [progress, setProgress] = useState(() => {
        const cached = localStorage.getItem('progress');
        return cached ? JSON.parse(cached) : { studyStreak: 0, xpPoints: 0, completedSessions: 0 };
    });
    const [achievements, setAchievements] = useState(() => {
        const cached = localStorage.getItem('achievements');
        return cached ? JSON.parse(cached) : [];
    });

    // Immediate loading state decision
    const [isLoading, setIsLoading] = useState(!studyPlan);

    useEffect(() => {
        let isMounted = true;

        const loadData = async (userId) => {
            if (!userId) return;

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
                    setUserName(profileResult.data.displayName || 'User');
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
                    setProgress(progressResult.data);
                    localStorage.setItem('progress', JSON.stringify(progressResult.data));
                }

                if (achievementsResult.success && achievementsResult.data) {
                    setAchievements(achievementsResult.data);
                    localStorage.setItem('achievements', JSON.stringify(achievementsResult.data));
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
        if (!hasPlan) return { studyStreak: 0, hoursLeft: 0, tasksDone: 0, xpPoints: 0 };
        return {
            studyStreak: progress.studyStreak || 0,
            hoursLeft: studyPlan.subjects.reduce((sum, s) => sum + (s.topics?.length || 1), 0),
            tasksDone: progress.completedSessions || 0,
            xpPoints: progress.xpPoints || 0
        };
    }, [hasPlan, progress, studyPlan]);

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
            status: i === 0 && stats.tasksDone > 0 ? 'completed' : (i === 1 && stats.tasksDone > 1 ? 'progress' : 'pending')
        }));
    }, [hasPlan, studyPlan, stats.tasksDone]);

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

    const handleNotificationClick = () => {
        alert("No new notifications at this time. You're all caught up!");
    };

    const handleToggleTask = (taskId) => {
        // In a real app, this would update Firestore. For now, we show feedback.
        alert(`Task ${taskId + 1} status updated! Great job.`);
    };

    // No blocking loading screen check here anymore
    // layout renders immediately with cached data or empty states

    return (
        <div className="dashboard-container">
            <Sidebar activeNav="dashboard" />
            <main className="main-content">
                <header className="dashboard-header">
                    <div className="header-left">
                        <h1>Welcome back, {userName}!</h1>
                        <p>{hasPlan ? "Let's tackle your study goals today" : "Create a study plan to get started"}</p>
                    </div>
                    <div className="header-right">
                        <button className="notification-btn" title="Notifications" onClick={handleNotificationClick}>
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
                            AI Assistant
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
                            <span className="stat-badge green">Streak</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">Study Streak</span>
                            <span className="stat-value">{stats.studyStreak} Days</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-ring purple">
                            <svg viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeDasharray={`${Math.min(stats.hoursLeft * 5, 94)} 94`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                            </svg>
                            <span className="ring-icon">🕒</span>
                            <span className="stat-badge blue">Left</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">Topics Left</span>
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
                            <span className="stat-badge gray">Done</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">Tasks Done</span>
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
                            <span className="stat-badge purple">Points</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">XP Points</span>
                            <span className="stat-value">{stats.xpPoints}</span>
                        </div>
                    </div>
                </section>

                <div className="middle-section">
                    <div className="tasks-panel">
                        <div className="panel-header">
                            <h2>Today's Tasks</h2>
                            <button className="view-all-btn" onClick={() => navigate('/study-plan')}>View All</button>
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
                                <p>You haven't set up a study plan yet.</p>
                                <Link to="/scheduling" className="setup-btn">Create Plan Now</Link>
                            </div>
                        )}
                    </div>

                    <div className="progress-panel">
                        <div className="panel-header">
                            <h2>Weekly Progress</h2>
                        </div>
                        {hasPlan ? (
                            <>
                                <div className="progress-overall">
                                    <span>Goal Completion</span>
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
                                    <span>Current Status</span>
                                    <span className="goal-value">{stats.tasksDone} / 10 Sessions</span>
                                </div>
                            </>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📈</div>
                                <p>Progress tracking will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bottom-section">
                    <div className="sessions-panel">
                        <div className="panel-header">
                            <h2>Upcoming Sessions</h2>
                            <button className="view-all-btn" onClick={() => navigate('/calendar')}>View All</button>
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
                                <p>No future sessions scheduled.</p>
                            </div>
                        )}
                    </div>

                    <div className="achievements-panel">
                        <div className="panel-header">
                            <h2>Recent Achievements</h2>
                            <button className="view-all-btn" onClick={() => navigate('/gamification')}>View All</button>
                        </div>
                        <div className="achievements-grid">
                            {achievements.length > 0 ? (
                                achievements.slice(0, 4).map((achievement) => (
                                    <div key={achievement.id} className="achievement-card">
                                        <span className="achievement-icon">{achievement.icon || '🏆'}</span>
                                        <span className="achievement-title">{achievement.title}</span>
                                        <span className="achievement-subtitle">{achievement.description || 'Achievement Unlocked!'}</span>
                                    </div>
                                ))
                            ) : (
                                <>
                                    <div className="achievement-card">
                                        <span className="achievement-icon">🔥</span>
                                        <span className="achievement-title">{stats.studyStreak} Day Streak</span>
                                        <span className="achievement-subtitle">{stats.studyStreak > 0 ? 'Keep it up!' : 'Start your streak!'}</span>
                                    </div>
                                    <div className="achievement-card">
                                        <span className="achievement-icon">📚</span>
                                        <span className="achievement-title">{stats.tasksDone} Tasks</span>
                                        <span className="achievement-subtitle">Completed</span>
                                    </div>
                                    <div className="achievement-card">
                                        <span className="achievement-icon">⭐</span>
                                        <span className="achievement-title">XP: {stats.xpPoints}</span>
                                        <span className="achievement-subtitle">Leveling Up</span>
                                    </div>
                                    <div className="achievement-card">
                                        <span className="achievement-icon">🏆</span>
                                        <span className="achievement-title">Newbie</span>
                                        <span className="achievement-subtitle">Getting started</span>
                                    </div>
                                </>
                            )}
                        </div>
                        {hasPlan && (
                            <div className="next-achievement">
                                <div className="next-achievement-info">
                                    <span>Progress to Next Goal</span>
                                    <strong>{stats.xpPoints < 100 ? '100 XP Milestone' : `${Math.ceil((stats.xpPoints + 1) / 500) * 500} XP Milestone`}</strong>
                                </div>
                                <div className="next-achievement-progress">
                                    <span className="progress-text">{(stats.xpPoints % 100)}%</span>
                                    <span className="progress-subtext">to next badge</span>
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