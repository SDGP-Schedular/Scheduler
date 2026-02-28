import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { getStudyPlan, getProgress, getUserProfile, getPlanHistory } from '../../services/firestoreService';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [activeNav, setActiveNav] = useState('home');
    const [studyPlan, setStudyPlan] = useState(null);
    const [progress, setProgress] = useState({ studyStreak: 0, xpPoints: 0, completedSessions: 0 });
    const [userName, setUserName] = useState('User');
    const [isLoading, setIsLoading] = useState(true);

    // Load data from Firestore
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);

            // First try localStorage for immediate display
            const cachedPlan = localStorage.getItem('studyPlan');
            if (cachedPlan) {
                try {
                    setStudyPlan(JSON.parse(cachedPlan));
                } catch (e) {
                    console.error('Error parsing cached plan:', e);
                }
            }

            // Then load from Firestore if user is logged in
            if (auth.currentUser) {
                try {
                    // Load user profile
                    const profileResult = await getUserProfile(auth.currentUser.uid);
                    if (profileResult.success && profileResult.data?.displayName) {
                        setUserName(profileResult.data.displayName);
                    }

                    // Load study plan from Firestore
                    const planResult = await getStudyPlan(auth.currentUser.uid);
                    if (planResult.success && planResult.data) {
                        setStudyPlan(planResult.data);
                    }

                    // Load progress
                    const progressResult = await getProgress(auth.currentUser.uid);
                    if (progressResult.success && progressResult.data) {
                        setProgress(progressResult.data);
                    }

                    // Preload plan history in background for faster access later
                    getPlanHistory(auth.currentUser.uid, 10).then(result => {
                        if (result.success && result.data) {
                            localStorage.setItem('planHistory', JSON.stringify(result.data));
                        }
                    }).catch(err => console.log('Background preload of plan history:', err));
                } catch (error) {
                    console.error('Error loading from Firestore:', error);
                }
            }

            setIsLoading(false);
        };

        loadData();
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/signin');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    // Calculate stats from study plan and progress
    const getStats = () => {
        if (!studyPlan || !studyPlan.subjects) {
            return { studyStreak: progress.studyStreak || 0, hoursLeft: 0, tasksDone: 0, xpPoints: progress.xpPoints || 0 };
        }

        const totalTopics = studyPlan.subjects.reduce((sum, s) => sum + (s.topics?.length || 0), 0);
        const hoursPerSubject = studyPlan.subjects.map(s => Math.ceil((s.topics?.length || 1) * 0.5) + 2);
        const totalHours = hoursPerSubject.reduce((sum, h) => sum + h, 0);

        return {
            studyStreak: progress.studyStreak || 0,
            hoursLeft: totalHours,
            tasksDone: progress.completedSessions || 0,
            xpPoints: progress.xpPoints || 0
        };
    };

    // Generate today's tasks from study plan
    const getTodayTasks = () => {
        if (!studyPlan || !studyPlan.subjects) return [];

        const today = new Date();
        const dayIndex = today.getDay(); // 0 = Sunday

        // Skip Sunday (rest day)
        if (dayIndex === 0) return [];

        const tasks = [];
        const prefs = studyPlan.preferences || {};
        const timeSlots = getTimeSlots(prefs.preferredTime || 'morning');

        studyPlan.subjects.forEach((subject, index) => {
            if (index < timeSlots.length) {
                const topics = subject.topics?.slice(0, 2) || [];
                tasks.push({
                    id: index,
                    subject: subject.name,
                    topics: topics.length > 0 ? topics.join(', ') : 'General Study',
                    time: timeSlots[index],
                    status: 'pending'
                });
            }
        });

        return tasks;
    };

    // Get time slots based on preferred time
    const getTimeSlots = (preferredTime) => {
        const slots = {
            morning: ['9:00 AM - 10:30 AM', '10:45 AM - 12:00 PM'],
            afternoon: ['2:00 PM - 3:30 PM', '3:45 PM - 5:00 PM'],
            evening: ['6:00 PM - 7:30 PM', '7:45 PM - 9:00 PM']
        };
        return slots[preferredTime] || slots.morning;
    };

    // Calculate weekly progress
    const getWeeklyProgress = () => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const daysPerWeek = studyPlan?.preferences?.daysPerWeek || 5;
        const sessionDuration = studyPlan?.preferences?.sessionDuration || 45;
        const subjectCount = studyPlan?.subjects?.length || 0;

        // Calculate planned hours per day
        const hoursPerDay = (subjectCount * sessionDuration) / 60;

        return days.map((day, index) => ({
            day,
            hours: index < daysPerWeek && index < 6 ? Math.round(hoursPerDay * 10) / 10 : 0,
            isRestDay: index === 6
        }));
    };

    // Get upcoming sessions
    const getUpcomingSessions = () => {
        if (!studyPlan || !studyPlan.subjects) return [];

        const sessions = [];
        const today = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const colors = ['blue', 'green', 'orange', 'purple', 'pink'];

        // Generate next 3 sessions
        for (let i = 0; i < 3 && i < studyPlan.subjects.length; i++) {
            const sessionDate = new Date(today);
            sessionDate.setDate(today.getDate() + i + 1);

            // Skip Sunday
            if (sessionDate.getDay() === 0) {
                sessionDate.setDate(sessionDate.getDate() + 1);
            }

            const subject = studyPlan.subjects[i];
            sessions.push({
                id: i,
                subject: subject.name,
                topics: subject.topics?.slice(0, 2).join(', ') || 'General Study',
                day: days[sessionDate.getDay()],
                date: sessionDate.getDate(),
                time: '9:00 AM - 10:30 AM',
                color: colors[i % colors.length]
            });
        }

        return sessions;
    };

    // Get weekly goal stats
    const getWeeklyGoal = () => {
        if (!studyPlan) return { current: 0, target: 0 };

        const subjectCount = studyPlan.subjects?.length || 0;
        const daysPerWeek = studyPlan.preferences?.daysPerWeek || 5;
        const sessionDuration = studyPlan.preferences?.sessionDuration || 45;

        const targetHours = Math.round((subjectCount * sessionDuration * daysPerWeek) / 60);

        return { current: 0, target: targetHours };
    };

    const stats = getStats();
    const todayTasks = getTodayTasks();
    const weeklyProgress = getWeeklyProgress();
    const upcomingSessions = getUpcomingSessions();
    const weeklyGoal = getWeeklyGoal();
    const hasPlan = studyPlan && studyPlan.subjects && studyPlan.subjects.length > 0;

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <img src={schedulerLogo} alt="Scheduler" className="sidebar-logo-img" />
                </div>

                <nav className="sidebar-nav">
                    {/* Home/Dashboard */}
                    <button
                        className={`nav-item ${activeNav === 'home' ? 'active' : ''}`}
                        onClick={() => setActiveNav('home')}
                        title="Dashboard"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <polyline points="9,22 9,12 15,12 15,22" />
                        </svg>
                    </button>

                    {/* Study Plan */}
                    <button
                        className={`nav-item ${activeNav === 'schedule' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveNav('schedule');
                            navigate(hasPlan ? '/study-plan' : '/scheduling');
                        }}
                        title="Study Plan"
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
                        className={`nav-item ${activeNav === 'stats' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveNav('stats');
                            navigate('/analytics');
                        }}
                        title="Analytics"
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
                        onClick={() => {
                            setActiveNav('calendar');
                            navigate('/calendar');
                        }}
                        title="Calendar"
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
                        onClick={() => {
                            setActiveNav('gamification');
                            navigate('/gamification');
                        }}
                        title="Gamification"
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

                    {/* AI Assistant - Sparkle Brain Icon */}
                    <button
                        className={`nav-item ${activeNav === 'ai' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveNav('ai');
                            navigate('/ai-assistant');
                        }}
                        title="AI Assistant"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44A2.5 2.5 0 015.5 17a2.5 2.5 0 01-1.94-4.06A2.5 2.5 0 015.5 9a2.5 2.5 0 011.5-4.56A2.5 2.5 0 019.5 2z" />
                            <path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44A2.5 2.5 0 0018.5 17a2.5 2.5 0 001.94-4.06A2.5 2.5 0 0018.5 9a2.5 2.5 0 00-1.5-4.56A2.5 2.5 0 0014.5 2z" />
                        </svg>
                    </button>

                    {/* Settings */}
                    <button
                        className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveNav('settings')}
                        title="Settings"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                    </button>
                </nav>

                <div className="sidebar-bottom">
                    <div className="user-avatar">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <header className="dashboard-header">
                    <div className="header-left">
                        <h1>Welcome back, {userName}!</h1>
                        <p>{hasPlan ? `You have ${studyPlan.subjects.length} subjects to study` : "Let's make today productive"}</p>
                    </div>
                    <div className="header-right">
                        <button className="notification-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                        </button>
                    </div>
                </header>

                {/* Stats Cards - Compact Design */}
                <section className="stats-section">
                    <div className="stat-card">
                        <div className="stat-ring blue">
                            <svg viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#3B82F6" strokeWidth="3" strokeDasharray={`${Math.min(stats.studyStreak * 10, 94)} 94`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                            </svg>
                            <span className="ring-icon">⚡</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats.studyStreak}</span>
                            <span className="stat-label">Day Streak</span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-ring orange">
                            <svg viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#F97316" strokeWidth="3" strokeDasharray={`${Math.min(stats.hoursLeft * 5, 94)} 94`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                            </svg>
                            <span className="ring-icon">⏱️</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats.hoursLeft}<small>hrs</small></span>
                            <span className="stat-label">Planned</span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-ring teal">
                            <svg viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#14B8A6" strokeWidth="3" strokeDasharray={`${(studyPlan?.subjects?.length || 0) * 15} 94`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                            </svg>
                            <span className="ring-icon">📚</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{studyPlan?.subjects?.length || 0}</span>
                            <span className="stat-label">Subjects</span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-ring purple">
                            <svg viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeDasharray={`${Math.min(stats.xpPoints / 50, 94)} 94`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                            </svg>
                            <span className="ring-icon">✨</span>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats.xpPoints >= 1000 ? `${(stats.xpPoints / 1000).toFixed(1)}k` : stats.xpPoints}</span>
                            <span className="stat-label">XP Points</span>
                        </div>
                    </div>
                </section>

                {/* Middle Section */}
                <section className="middle-section">
                    {/* Today's Tasks */}
                    <div className="tasks-panel">
                        <div className="panel-header">
                            <h2>Today's Tasks</h2>
                            <button className="view-all-btn" onClick={() => navigate('/study-plan')}>View All</button>
                        </div>
                        {hasPlan && todayTasks.length > 0 ? (
                            <div className="tasks-list">
                                {todayTasks.map((task, index) => (
                                    <div key={task.id} className="task-item">
                                        <div className="task-checkbox">
                                            {index === 0 && (
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
                                            {task.status === 'pending' ? 'Pending' : 'Done'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📋</div>
                                <h3>No tasks yet</h3>
                                <p>Set up your study schedule to see your tasks here</p>
                                <Link to="/scheduling" className="setup-btn">Set Up Schedule</Link>
                            </div>
                        )}
                    </div>

                    {/* Weekly Progress */}
                    <div className="progress-panel">
                        <h2>Weekly Progress</h2>
                        <div className="progress-overall">
                            <span>Overall Progress</span>
                            <span className="progress-percent">{hasPlan ? '0%' : '0%'}</span>
                        </div>
                        <div className="progress-bars">
                            {weeklyProgress.map((day, index) => (
                                <div key={index} className="progress-day">
                                    <span className="day-label">{day.day}</span>
                                    <div className="progress-bar-container">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${(day.hours / 6) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="hours-label">{day.hours}h</span>
                                </div>
                            ))}
                        </div>
                        <div className="weekly-goal">
                            <span>Weekly Goal</span>
                            <span className="goal-value">{weeklyGoal.current} / {weeklyGoal.target} hrs</span>
                        </div>
                    </div>
                </section>

                {/* Bottom Section */}
                <section className="bottom-section">
                    {/* Upcoming Sessions */}
                    <div className="sessions-panel">
                        <div className="panel-header">
                            <h2>Upcoming Sessions</h2>
                            <button className="view-all-btn" onClick={() => navigate('/study-plan')}>View All</button>
                        </div>
                        {hasPlan && upcomingSessions.length > 0 ? (
                            <div className="sessions-list">
                                {upcomingSessions.map((session) => (
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
                                <div className="empty-icon">📅</div>
                                <h3>No sessions scheduled</h3>
                                <p>Create your study plan to see upcoming sessions</p>
                                <Link to="/scheduling" className="setup-btn">Create Schedule</Link>
                            </div>
                        )}
                    </div>

                    {/* Recent Achievements */}
                    <div className="achievements-panel">
                        <div className="panel-header">
                            <h2>Recent Achievements</h2>
                            <button className="view-all-btn">View All</button>
                        </div>
                        {hasPlan ? (
                            <>
                                <div className="achievements-grid">
                                    <div className="achievement-card">
                                        <span className="achievement-icon">🎯</span>
                                        <span className="achievement-title">Plan Created</span>
                                        <span className="achievement-subtitle">Study plan ready!</span>
                                    </div>
                                    <div className="achievement-card">
                                        <span className="achievement-icon">📚</span>
                                        <span className="achievement-title">{studyPlan.subjects.length} Subjects</span>
                                        <span className="achievement-subtitle">Added to plan</span>
                                    </div>
                                </div>
                                <div className="next-achievement">
                                    <div className="next-achievement-info">
                                        <span>Next Achievement</span>
                                        <strong>Complete First Session</strong>
                                    </div>
                                    <div className="next-achievement-progress">
                                        <span className="progress-text">0/1</span>
                                        <span className="progress-subtext">Sessions</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">🏆</div>
                                <h3>No achievements yet</h3>
                                <p>Start studying to earn rewards and achievements</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Dashboard;
