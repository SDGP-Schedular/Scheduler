import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { getStudyPlan, getProgress, getAchievements } from '../../services/firestoreService';
import { subjectsData } from '../../data/subjectsData';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './Gamification.css';

const Gamification = () => {
    const navigate = useNavigate();
    const [activeNav, setActiveNav] = useState('gamification');
    const [studyPlan, setStudyPlan] = useState(null);
    const [progress, setProgress] = useState({ xpPoints: 0, studyStreak: 0, completedSessions: 0 });
    const [achievements, setAchievements] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [showManualSelect, setShowManualSelect] = useState(false);
    const [manualSubjects, setManualSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Level thresholds and titles
    const levelThresholds = [
        { level: 1, xp: 0, title: 'Beginner' },
        { level: 2, xp: 500, title: 'Learner' },
        { level: 3, xp: 1500, title: 'Student' },
        { level: 4, xp: 3000, title: 'Scholar' },
        { level: 5, xp: 5000, title: 'Expert' },
        { level: 6, xp: 8000, title: 'Master' },
        { level: 7, xp: 12000, title: 'Sage' },
        { level: 8, xp: 17000, title: 'Grandmaster' },
    ];

    // All available subjects for manual selection
    const allSubjects = Object.keys(subjectsData);

    // Badge collection
    const allBadges = [
        { id: 'champion', name: 'Champion', icon: '🏆', unlocked: false },
        { id: 'rising_star', name: 'Rising Star', icon: '⭐', unlocked: false },
        { id: 'quiz_champ', name: 'Quiz Champ', icon: '🎯', unlocked: false },
        { id: 'early_bird', name: 'Early Bird', icon: '🌅', unlocked: false },
        { id: 'consistency', name: 'Consistent', icon: '📊', unlocked: false },
        { id: 'daily_grinder', name: 'Daily Grinder', icon: '💪', unlocked: false },
        { id: 'achiever', name: 'Achiever', icon: '✅', unlocked: false },
        { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', unlocked: false },
    ];

    // Subject icons mapping
    const subjectIcons = {
        'Mathematics': '📐',
        'Combined Mathematics': '📊',
        'Physics': '⚛️',
        'Chemistry': '🧪',
        'Biology': '🧬',
        'English': '📚',
        'ICT': '💻',
        'Science': '🔬',
        'History': '📜',
        'Geography': '🌍',
        'Sinhala': '📖',
        'Tamil': '📖',
        'Commerce': '💼',
        'Accounting': '📈',
        'Economics': '📉',
        'default': '📚'
    };

    // Subject colors
    const subjectColors = {
        'Mathematics': { bg: '#EEF2FF', color: '#6366F1' },
        'Combined Mathematics': { bg: '#EEF2FF', color: '#6366F1' },
        'Physics': { bg: '#FEF3C7', color: '#F59E0B' },
        'Chemistry': { bg: '#FEE2E2', color: '#EF4444' },
        'Biology': { bg: '#D1FAE5', color: '#10B981' },
        'English': { bg: '#FCE7F3', color: '#EC4899' },
        'ICT': { bg: '#CFFAFE', color: '#06B6D4' },
        'Science': { bg: '#FEE2E2', color: '#EF4444' },
        'default': { bg: '#F3F4F6', color: '#6B7280' }
    };

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);

            // Load from localStorage first
            const cachedPlan = localStorage.getItem('studyPlan');
            if (cachedPlan) {
                try {
                    setStudyPlan(JSON.parse(cachedPlan));
                } catch (e) {
                    console.error('Error parsing cached plan:', e);
                }
            }

            // Load from Firestore
            if (auth.currentUser) {
                try {
                    const [planResult, progressResult, achievementsResult] = await Promise.all([
                        getStudyPlan(auth.currentUser.uid),
                        getProgress(auth.currentUser.uid),
                        getAchievements(auth.currentUser.uid)
                    ]);

                    if (planResult.success && planResult.data) {
                        setStudyPlan(planResult.data);
                    }
                    if (progressResult.success && progressResult.data) {
                        setProgress(progressResult.data);
                    }
                    if (achievementsResult.success && achievementsResult.data) {
                        setAchievements(achievementsResult.data);
                    }
                } catch (error) {
                    console.error('Error loading data:', error);
                }
            }

            setIsLoading(false);
        };

        loadData();
    }, []);

    // Calculate current level from XP
    const getCurrentLevel = () => {
        const xp = progress.xpPoints || 0;
        let currentLevel = levelThresholds[0];

        for (const level of levelThresholds) {
            if (xp >= level.xp) {
                currentLevel = level;
            } else {
                break;
            }
        }
        return currentLevel;
    };

    // Calculate progress to next level
    const getLevelProgress = () => {
        const xp = progress.xpPoints || 0;
        const currentLevel = getCurrentLevel();
        const currentLevelIndex = levelThresholds.findIndex(l => l.level === currentLevel.level);
        const nextLevel = levelThresholds[currentLevelIndex + 1];

        if (!nextLevel) {
            return { current: xp, max: xp, percentage: 100 };
        }

        const xpInCurrentLevel = xp - currentLevel.xp;
        const xpNeededForNext = nextLevel.xp - currentLevel.xp;
        const percentage = Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100);

        return {
            current: xp,
            max: nextLevel.xp,
            percentage,
            needed: nextLevel.xp - xp
        };
    };

    // Get subjects from study plan or empty for manual mode
    const getPlanSubjects = () => {
        if (studyPlan?.subjects && studyPlan.subjects.length > 0) {
            return studyPlan.subjects.map(s => s.name);
        }
        return [];
    };

    // Handle subject selection for quiz
    const handleSubjectSelect = (subject) => {
        setSelectedSubject(subject);
    };

    // Handle starting quiz
    const handleEnterQuiz = () => {
        if (selectedSubject) {
            navigate(`/quiz?subject=${encodeURIComponent(selectedSubject)}`);
        }
    };

    // Toggle manual subject selection
    const handleManualSubjectToggle = (subject) => {
        setManualSubjects(prev =>
            prev.includes(subject)
                ? prev.filter(s => s !== subject)
                : [...prev, subject]
        );
    };

    // Get badges with unlock status
    const getBadges = () => {
        const unlockedIds = achievements.map(a => a.id);
        return allBadges.map(badge => ({
            ...badge,
            unlocked: unlockedIds.includes(badge.id)
        }));
    };

    const currentLevel = getCurrentLevel();
    const levelProgress = getLevelProgress();
    const planSubjects = getPlanSubjects();
    const hasPlan = planSubjects.length > 0;
    const badges = getBadges();
    const unlockedCount = badges.filter(b => b.unlocked).length;

    return (
        <div className="gamification-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <img src={schedulerLogo} alt="Scheduler" className="sidebar-logo-img" />
                </div>

                <nav className="sidebar-nav">
                    <button
                        className="nav-item"
                        onClick={() => navigate('/dashboard')}
                        title="Dashboard"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <polyline points="9,22 9,12 15,12 15,22" />
                        </svg>
                    </button>

                    <button
                        className="nav-item"
                        onClick={() => navigate(hasPlan ? '/study-plan' : '/scheduling')}
                        title="Study Plan"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                    </button>

                    <button
                        className="nav-item"
                        onClick={() => navigate('/analytics')}
                        title="Analytics"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                    </button>

                    <button
                        className="nav-item"
                        onClick={() => navigate('/calendar')}
                        title="Calendar"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </button>

                    <button
                        className="nav-item active"
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

                    <button
                        className="nav-item"
                        onClick={() => navigate('/ai-assistant')}
                        title="AI Assistant"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44A2.5 2.5 0 015.5 17a2.5 2.5 0 01-1.94-4.06A2.5 2.5 0 015.5 9a2.5 2.5 0 011.5-4.56A2.5 2.5 0 019.5 2z" />
                            <path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44A2.5 2.5 0 0018.5 17a2.5 2.5 0 001.94-4.06A2.5 2.5 0 0018.5 9a2.5 2.5 0 00-1.5-4.56A2.5 2.5 0 0014.5 2z" />
                        </svg>
                    </button>

                    <button
                        className="nav-item"
                        onClick={() => navigate('/reminder-settings')}
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
                        {auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Header with Level */}
                <header className="gamification-header">
                    <div className="header-left">
                        <img src={schedulerLogo} alt="Scheduler" className="header-logo" />
                        <span className="header-title">Scheduler</span>
                    </div>
                    <div className="header-right">
                        <span className="level-badge">Level {currentLevel.level}</span>
                        <div className="user-avatar-small">
                            {auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </div>
                </header>

                <div className="gamification-grid">
                    {/* Left Column */}
                    <div className="left-column">
                        {/* Level Progress Card */}
                        <div className="card level-progress-card">
                            <div className="level-progress-header">
                                <h2>Level Progress</h2>
                                <span className="level-tag">
                                    <span className="star-icon">⭐</span>
                                    Level {currentLevel.level}
                                </span>
                            </div>
                            <div className="level-info">
                                <span>Current Level: {currentLevel.level}</span>
                                <span>Next Level: {currentLevel.level + 1}</span>
                            </div>
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar"
                                    style={{ width: `${levelProgress.percentage}%` }}
                                >
                                    <span className="progress-text">
                                        {progress.xpPoints?.toLocaleString() || 0} / {levelProgress.max?.toLocaleString()} XP
                                    </span>
                                </div>
                            </div>
                            <p className="xp-needed">
                                {levelProgress.needed?.toLocaleString() || 0} XP needed to reach Level {currentLevel.level + 1}
                            </p>
                        </div>

                        {/* Select Subjects Card */}
                        <div className="card subjects-card">
                            <h2>Select Subjects</h2>

                            {hasPlan ? (
                                <div className="subjects-grid">
                                    {planSubjects.map((subject, index) => (
                                        <button
                                            key={index}
                                            className={`subject-chip ${selectedSubject === subject ? 'selected' : ''}`}
                                            onClick={() => handleSubjectSelect(subject)}
                                            style={{
                                                backgroundColor: selectedSubject === subject
                                                    ? (subjectColors[subject]?.color || subjectColors.default.color)
                                                    : (subjectColors[subject]?.bg || subjectColors.default.bg),
                                                color: selectedSubject === subject
                                                    ? '#fff'
                                                    : (subjectColors[subject]?.color || subjectColors.default.color)
                                            }}
                                        >
                                            <span className="subject-icon">
                                                {subjectIcons[subject] || subjectIcons.default}
                                            </span>
                                            {subject}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-plan-message">
                                    <p>No study plan found. Select subjects manually or create a study plan.</p>
                                    <button
                                        className="manual-select-btn"
                                        onClick={() => setShowManualSelect(!showManualSelect)}
                                    >
                                        {showManualSelect ? 'Hide Subjects' : 'Select Subjects Manually'}
                                    </button>

                                    {showManualSelect && (
                                        <div className="manual-subjects-grid">
                                            {allSubjects.slice(0, 12).map((subject, index) => (
                                                <button
                                                    key={index}
                                                    className={`subject-chip ${manualSubjects.includes(subject) ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        handleManualSubjectToggle(subject);
                                                        handleSubjectSelect(subject);
                                                    }}
                                                    style={{
                                                        backgroundColor: manualSubjects.includes(subject)
                                                            ? (subjectColors[subject]?.color || subjectColors.default.color)
                                                            : (subjectColors[subject]?.bg || subjectColors.default.bg),
                                                        color: manualSubjects.includes(subject)
                                                            ? '#fff'
                                                            : (subjectColors[subject]?.color || subjectColors.default.color)
                                                    }}
                                                >
                                                    <span className="subject-icon">
                                                        {subjectIcons[subject] || subjectIcons.default}
                                                    </span>
                                                    {subject}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                className="enter-quiz-btn"
                                onClick={handleEnterQuiz}
                                disabled={!selectedSubject}
                            >
                                Enter Quiz
                            </button>
                        </div>

                        {/* Recent Achievements */}
                        <div className="card achievements-card">
                            <div className="achievements-header">
                                <h2>Recent Achievements</h2>
                                <button className="view-all-btn">View All</button>
                            </div>
                            <div className="achievements-grid">
                                {achievements.length > 0 ? (
                                    achievements.slice(0, 4).map((achievement, index) => (
                                        <div key={index} className="achievement-item">
                                            <div className={`achievement-icon ${achievement.type || 'default'}`}>
                                                {achievement.icon || '🏆'}
                                            </div>
                                            <span className="achievement-name">{achievement.title}</span>
                                            <span className="achievement-date">
                                                {achievement.unlockedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        <div className="achievement-item placeholder">
                                            <div className="achievement-icon gold">🏆</div>
                                            <span className="achievement-name">First Step</span>
                                            <span className="achievement-date">Complete a quiz</span>
                                        </div>
                                        <div className="achievement-item placeholder">
                                            <div className="achievement-icon silver">⚡</div>
                                            <span className="achievement-name">Speed Demon</span>
                                            <span className="achievement-date">Locked</span>
                                        </div>
                                        <div className="achievement-item placeholder">
                                            <div className="achievement-icon bronze">🔥</div>
                                            <span className="achievement-name">On a Roll</span>
                                            <span className="achievement-date">Locked</span>
                                        </div>
                                        <div className="achievement-item placeholder">
                                            <div className="achievement-icon purple">🧙</div>
                                            <span className="achievement-name">Math Wizard</span>
                                            <span className="achievement-date">Locked</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Badge Collection */}
                        <div className="card badges-card">
                            <div className="badges-header">
                                <h2>Badge Collection</h2>
                                <span className="badges-progress">Progress: {unlockedCount}/{badges.length}</span>
                            </div>
                            <div className="badges-grid">
                                {badges.map((badge, index) => (
                                    <div
                                        key={index}
                                        className={`badge-item ${badge.unlocked ? 'unlocked' : 'locked'}`}
                                    >
                                        <div className="badge-icon">{badge.icon}</div>
                                        <span className="badge-name">{badge.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Active Challenges */}
                        <div className="card challenges-card">
                            <h2>Active Challenges</h2>
                            <div className="challenge-item">
                                <div className="challenge-info">
                                    <span className="challenge-title">Complete 10 Quizzes</span>
                                    <span className="challenge-reward">+500 XP</span>
                                </div>
                                <div className="challenge-progress">
                                    <span>Progress: {Math.min(progress.completedSessions || 0, 10)}/10</span>
                                    <span className="challenge-time">2 days left</span>
                                </div>
                                <div className="challenge-bar">
                                    <div
                                        className="challenge-bar-fill"
                                        style={{ width: `${Math.min((progress.completedSessions || 0) / 10 * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div className="challenge-item">
                                <div className="challenge-info">
                                    <span className="challenge-title">Daily Login Streak</span>
                                    <span className="challenge-reward">+200 XP</span>
                                </div>
                                <div className="challenge-progress">
                                    <span>Progress: {Math.min(progress.studyStreak || 0, 30)}/30</span>
                                    <span className="challenge-time">15 days left</span>
                                </div>
                                <div className="challenge-bar">
                                    <div
                                        className="challenge-bar-fill green"
                                        style={{ width: `${Math.min((progress.studyStreak || 0) / 30 * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="right-column">
                        {/* Daily Streak */}
                        <div className="card streak-card">
                            <div className="streak-icon">🔥</div>
                            <h3>Daily Streak</h3>
                            <div className="streak-number">{progress.studyStreak || 0}</div>
                            <span className="streak-label">days in a row</span>
                        </div>

                        {/* Current Level */}
                        <div className="card current-level-card">
                            <div className="level-circle">
                                {currentLevel.level}
                            </div>
                            <h3>Current Level</h3>
                            <span className="level-title">{currentLevel.title}</span>
                            <span className="achievements-count">Unlocked {achievements.length} achievements</span>
                        </div>

                        {/* Quick Stats */}
                        <div className="card quick-stats-card">
                            <h3>Quick Stats</h3>
                            <div className="stats-list">
                                <div className="stat-row">
                                    <span className="stat-label">Total XP</span>
                                    <span className="stat-value blue">{progress.xpPoints?.toLocaleString() || 0}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Achievements</span>
                                    <span className="stat-value green">{achievements.length}/{allBadges.length + 10}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Best Streak</span>
                                    <span className="stat-value orange">{progress.studyStreak || 0} days</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Rank</span>
                                    <span className="stat-value gray">#{Math.max(1, 500 - Math.floor((progress.xpPoints || 0) / 50))}</span>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Rewards */}
                        <div className="card rewards-card">
                            <h3>Upcoming Rewards</h3>
                            <div className="reward-item">
                                <div className="reward-icon gold">👑</div>
                                <div className="reward-info">
                                    <span className="reward-title">Level {currentLevel.level + 1} Reward</span>
                                    <span className="reward-desc">Exclusive Crown Badge</span>
                                </div>
                                <span className="reward-xp">{levelProgress.needed?.toLocaleString() || 0} XP</span>
                            </div>
                            <div className="reward-item">
                                <div className="reward-icon orange">🔥</div>
                                <div className="reward-info">
                                    <span className="reward-title">30-Day Streak</span>
                                    <span className="reward-desc">Fire Master Badge</span>
                                </div>
                                <span className="reward-days">{Math.max(0, 30 - (progress.studyStreak || 0))} days</span>
                            </div>
                            <div className="reward-item">
                                <div className="reward-icon green">💎</div>
                                <div className="reward-info">
                                    <span className="reward-title">Diamond Tier</span>
                                    <span className="reward-desc">Special Avatar Frame</span>
                                </div>
                                <span className="reward-level">Level 30</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Gamification;
