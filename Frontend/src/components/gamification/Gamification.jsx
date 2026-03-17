import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import { auth } from '../../config/firebase';
import { getStudyPlan, getProgress, getAchievements } from '../../services/firestoreService';
import { subjectsData } from '../../data/subjectsData';
import { grades, getSubjectsForGrade, getTopicsForSubject } from '../../data/gradesData';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './Gamification.css';

const Gamification = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [studyPlan, setStudyPlan] = useState(null);
    const [progress, setProgress] = useState({ xpPoints: 0, studyStreak: 0, completedSessions: 0 });
    const [achievements, setAchievements] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [showManualSelect, setShowManualSelect] = useState(false);
    const [manualSubjects, setManualSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Quiz configuration state
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [numQuestions, setNumQuestions] = useState(10);
    const [quizTime, setQuizTime] = useState(15);
    const [difficulty, setDifficulty] = useState('Mixed');
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [availableTopics, setAvailableTopics] = useState([]);

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

    // Handle grade selection
    const handleGradeChange = (grade) => {
        setSelectedGrade(grade);
        setSelectedSubject(null);
        setSelectedTopic('');

        if (grade) {
            const subjects = getSubjectsForGrade(grade, subjectsData);
            setAvailableSubjects(subjects);
        } else {
            setAvailableSubjects([]);
        }
        setAvailableTopics([]);
    };

    // Handle subject selection for quiz (for both plan and manual selection)
    const handleSubjectSelect = (subject) => {
        setSelectedSubject(subject);
        setSelectedTopic('');

        // Load topics for this subject
        const topics = getTopicsForSubject(subject, subjectsData);
        setAvailableTopics(topics);
    };

    // Handle topic selection
    const handleTopicChange = (topic) => {
        setSelectedTopic(topic);
    };

    // Handle starting quiz
    const handleEnterQuiz = () => {
        if (!selectedSubject) {
            alert('Please select a subject to start the quiz.');
            return;
        }

        // Validate manual selection mode requirements
        if (!hasPlan) {
            if (!selectedGrade) {
                alert('Please select your grade level.');
                return;
            }
            if (!selectedTopic) {
                alert('Please select a topic.');
                return;
            }
        }

        // Navigate to quiz with configuration
        navigate('/quiz', {
            state: {
                grade: selectedGrade || studyPlan?.grade || '10',
                subject: selectedSubject,
                topic: selectedTopic,
                numQuestions,
                time: quizTime,
                difficulty
            }
        });
    };


    // Get badges with unlock status
    const getBadges = () => {
        const unlockedIds = achievements.map(a => a.id);
        return allBadges.map(badge => ({
            ...badge,
            unlocked: unlockedIds.includes(badge.id)
        }));
    };

    const handleViewAllAchievements = () => {
        const badgesSection = document.querySelector('.badges-card');
        if (badgesSection) {
            badgesSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert("All achievements are listed below in your Badge Collection!");
        }
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
            <Sidebar activeNav="gamification" />

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

                        {/* Quiz Configuration Card */}
                        <div className="card subjects-card">
                            <h2>Quiz Configuration</h2>

                            {hasPlan ? (
                                <>
                                    {/* For users with study plan - show subject chips */}
                                    <div className="quiz-config-section">
                                        <label className="quiz-config-label">Select Subject</label>
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
                                    </div>

                                    {/* Topic selection for plan users */}
                                    {selectedSubject && availableTopics.length > 0 && (
                                        <div className="quiz-config-section">
                                            <label className="quiz-config-label">Select Topic</label>
                                            <select
                                                className="quiz-dropdown"
                                                value={selectedTopic}
                                                onChange={(e) => setSelectedTopic(e.target.value)}
                                            >
                                                <option value="">All Topics (Mixed)</option>
                                                {availableTopics.map((topic, index) => (
                                                    <option key={index} value={topic}>{topic}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* For users without study plan - show dropdowns */}
                                    <p className="quiz-config-description">
                                        Select your grade, subject, and topic to start a quiz
                                    </p>

                                    {/* Grade Selection */}
                                    <div className="quiz-config-section">
                                        <label className="quiz-config-label">1. Select Your Grade</label>
                                        <select
                                            className="quiz-dropdown"
                                            value={selectedGrade}
                                            onChange={(e) => handleGradeChange(e.target.value)}
                                        >
                                            <option value="">Choose grade...</option>
                                            {grades.map((grade) => (
                                                <option key={grade.id} value={grade.value}>
                                                    {grade.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Subject Selection */}
                                    {selectedGrade && (
                                        <div className="quiz-config-section">
                                            <label className="quiz-config-label">2. Select Subject</label>
                                            <select
                                                className="quiz-dropdown"
                                                value={selectedSubject || ''}
                                                onChange={(e) => handleSubjectSelect(e.target.value)}
                                            >
                                                <option value="">Choose subject...</option>
                                                {availableSubjects.map((subject, index) => (
                                                    <option key={index} value={subject.name}>
                                                        {subject.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Topic Selection */}
                                    {selectedSubject && availableTopics.length > 0 && (
                                        <div className="quiz-config-section">
                                            <label className="quiz-config-label">3. Select Topic</label>
                                            <select
                                                className="quiz-dropdown"
                                                value={selectedTopic}
                                                onChange={(e) => handleTopicChange(e.target.value)}
                                            >
                                                <option value="">Choose topic...</option>
                                                {availableTopics.map((topic, index) => (
                                                    <option key={index} value={topic}>{topic}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Quiz Settings - shown after subject is selected */}
                            {selectedSubject && (
                                <>
                                    <div className="quiz-settings-divider"></div>
                                    <h3 className="quiz-settings-title">Quiz Settings</h3>

                                    <div className="quiz-settings-grid">
                                        {/* Number of Questions */}
                                        <div className="quiz-config-section">
                                            <label className="quiz-config-label">Number of Questions</label>
                                            <select
                                                className="quiz-dropdown"
                                                value={numQuestions}
                                                onChange={(e) => setNumQuestions(Number(e.target.value))}
                                            >
                                                <option value="5">5 questions</option>
                                                <option value="10">10 questions</option>
                                                <option value="15">15 questions</option>
                                                <option value="20">20 questions</option>
                                                <option value="25">25 questions</option>
                                                <option value="30">30 questions</option>
                                            </select>
                                        </div>

                                        {/* Time Duration */}
                                        <div className="quiz-config-section">
                                            <label className="quiz-config-label">Time Duration</label>
                                            <select
                                                className="quiz-dropdown"
                                                value={quizTime}
                                                onChange={(e) => setQuizTime(Number(e.target.value))}
                                            >
                                                <option value="5">5 minutes</option>
                                                <option value="10">10 minutes</option>
                                                <option value="15">15 minutes</option>
                                                <option value="20">20 minutes</option>
                                                <option value="30">30 minutes</option>
                                                <option value="45">45 minutes</option>
                                                <option value="60">60 minutes</option>
                                            </select>
                                        </div>

                                        {/* Difficulty Level */}
                                        <div className="quiz-config-section">
                                            <label className="quiz-config-label">Difficulty Level</label>
                                            <select
                                                className="quiz-dropdown"
                                                value={difficulty}
                                                onChange={(e) => setDifficulty(e.target.value)}
                                            >
                                                <option value="Easy">Easy</option>
                                                <option value="Medium">Medium</option>
                                                <option value="Hard">Hard</option>
                                                <option value="Mixed">Mixed (All Levels)</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}

                            <button
                                className="enter-quiz-btn"
                                onClick={handleEnterQuiz}
                                disabled={!selectedSubject || (!hasPlan && (!selectedGrade || !selectedTopic))}
                            >
                                🎯 Enter Quiz
                            </button>
                        </div>

                        {/* Recent Achievements */}
                        <div className="card achievements-card">
                            <div className="achievements-header">
                                <h2>Recent Achievements</h2>
                                <button className="view-all-btn" onClick={handleViewAllAchievements}>View All</button>
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
