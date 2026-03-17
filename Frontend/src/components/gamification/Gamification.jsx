import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import { auth } from '../../config/firebase';
import { getStudyPlan, getProgress, getAchievements } from '../../services/firestoreService';
import { checkAiQuizLimit } from '../../services/quizService';
import { subjectsData } from '../../data/subjectsData';
import { grades, getSubjectsForGrade, getTopicsForSubject } from '../../data/gradesData';
import { useLanguage } from '../../i18n/LanguageContext';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './Gamification.css';

const Gamification = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();
    const [studyPlan, setStudyPlan] = useState(null);
    const [progress, setProgress] = useState({ xpPoints: 0, studyStreak: 0, completedSessions: 0 });
    const [achievements, setAchievements] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [showManualSelect, setShowManualSelect] = useState(false);
    const [manualSubjects, setManualSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAllAchievements, setShowAllAchievements] = useState(false);

    // Quiz configuration state
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [numQuestions, setNumQuestions] = useState(10);
    const [quizTime, setQuizTime] = useState(10);
    const [difficulty, setDifficulty] = useState('Mixed');
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [availableTopics, setAvailableTopics] = useState([]);

    // AI Quiz limit state
    const [aiQuizLimit, setAiQuizLimit] = useState({ used: 0, limit: 3, remaining: 3, resetsAt: null });
    const [aiCountdown, setAiCountdown] = useState('');

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

    // Badge collection — all 25 achievable badges organized by category
    const badgeCategories = [
        {
            name: 'Completion Milestones',
            icon: '🎯',
            badges: [
                { id: 'first_steps', name: 'First Steps', icon: '🎯', description: 'Complete your first quiz' },
                { id: 'dedicated_learner', name: 'Dedicated Learner', icon: '📚', description: 'Complete 5 quizzes' },
                { id: 'quiz_enthusiast', name: 'Quiz Enthusiast', icon: '⭐', description: 'Complete 10 quizzes' },
                { id: 'quiz_master', name: 'Quiz Master', icon: '🏆', description: 'Complete 25 quizzes' },
                { id: 'quiz_legend', name: 'Quiz Legend', icon: '👑', description: 'Complete 50 quizzes' },
                { id: 'quiz_deity', name: 'Quiz Deity', icon: '🌟', description: 'Complete 100 quizzes' },
            ]
        },
        {
            name: 'Performance',
            icon: '🏆',
            badges: [
                { id: 'rising_star', name: 'Rising Star', icon: '⭐', description: 'Score 80%+ on a quiz' },
                { id: 'champion', name: 'Champion', icon: '🏆', description: 'Score 100% on a quiz' },
                { id: 'hard_mode_hero', name: 'Hard Mode Hero', icon: '🛡️', description: 'Score 80%+ on Hard difficulty' },
                { id: 'no_mistakes', name: 'No Mistakes', icon: '✨', description: 'Perfect score on 20+ questions' },
            ]
        },
        {
            name: 'Speed',
            icon: '⚡',
            badges: [
                { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', description: 'Perfect score in <50% time' },
                { id: 'lightning_fast', name: 'Lightning Fast', icon: '⚡️', description: 'Perfect score in <30% time' },
                { id: 'flash', name: 'Flash', icon: '💫', description: 'Perfect score in <25% time' },
                { id: 'unbeatable', name: 'Unbeatable', icon: '🚀', description: 'Perfect Hard quiz in <50% time' },
                { id: 'speedrunner', name: 'Speedrunner', icon: '🏃', description: 'Perfect 20+ questions in <40% time' },
            ]
        },
        {
            name: 'Subject Mastery',
            icon: '🧙',
            badges: [
                { id: 'math_wizard', name: 'Math Wizard', icon: '🧙‍♂️', description: 'Score 90%+ in Mathematics' },
                { id: 'science_genius', name: 'Science Genius', icon: '🔬', description: 'Score 90%+ in Science/Physics/Chemistry' },
                { id: 'language_expert', name: 'Language Expert', icon: '📖', description: 'Score 90%+ in a language subject' },
                { id: 'tech_savvy', name: 'Tech Savvy', icon: '💻', description: 'Score 90%+ in ICT/Programming' },
                { id: 'history_buff', name: 'History Buff', icon: '📜', description: 'Score 90%+ in History' },
                { id: 'commerce_pro', name: 'Commerce Pro', icon: '💼', description: 'Score 90%+ in Commerce/Accounting/Economics' },
            ]
        },
        {
            name: 'Challenges',
            icon: '🎮',
            badges: [
                { id: 'night_owl', name: 'Night Owl', icon: '🦉', description: 'Complete a quiz after 10 PM' },
                { id: 'early_bird', name: 'Early Bird', icon: '🌅', description: 'Complete a quiz before 7 AM' },
                { id: 'marathon_runner', name: 'Marathon Runner', icon: '🏃‍♂️', description: 'Score 85%+ on 30+ questions' },
            ]
        },
        {
            name: 'Study Plan',
            icon: '📋',
            badges: [
                { id: 'first_plan', name: 'First Plan', icon: '📋', description: 'Create your first study plan' },
                { id: 'multi_subject', name: 'Multi-Tasker', icon: '🎯', description: 'Add 3+ subjects to a plan' },
            ]
        }
    ];

    // Flatten all badges for backward compatibility
    const allBadges = badgeCategories.flatMap(cat => cat.badges);

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

    // Auto-adjust quiz time when question count changes
    useEffect(() => {
        const minTime = Math.max(1, numQuestions);
        const maxTime = numQuestions * 3;
        if (quizTime < minTime) setQuizTime(minTime);
        else if (quizTime > maxTime) setQuizTime(maxTime);
    }, [numQuestions]);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);

            // 1. INSTANT: Load from localStorage cache first
            const cachedPlan = localStorage.getItem('studyPlan');
            if (cachedPlan) {
                try {
                    setStudyPlan(JSON.parse(cachedPlan));
                } catch (e) {
                    console.error('Error parsing cached plan:', e);
                }
            }

            const cachedProgress = localStorage.getItem('gamificationProgress');
            if (cachedProgress) {
                try {
                    setProgress(JSON.parse(cachedProgress));
                } catch (e) {
                    console.error('Error parsing cached progress:', e);
                }
            }

            const cachedAchievements = localStorage.getItem('gamificationAchievements');
            if (cachedAchievements) {
                try {
                    setAchievements(JSON.parse(cachedAchievements));
                } catch (e) {
                    console.error('Error parsing cached achievements:', e);
                }
            }

            // 2. BACKGROUND: Fetch latest from Firestore and update
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
                            localStorage.setItem('gamificationProgress', JSON.stringify(merged));
                            return merged;
                        });
                    }
                    if (achievementsResult.success) {
                        // Always update achievements — merge Firestore with existing cache
                        setAchievements(prev => {
                            const fsAchievements = achievementsResult.data || [];
                            if (fsAchievements.length === 0 && prev.length === 0) {
                                localStorage.setItem('gamificationAchievements', '[]');
                                return prev;
                            }
                            const existingIds = new Set(prev.map(a => a.id || a.badge || a.type));
                            const newFromFirestore = fsAchievements.filter(a => !existingIds.has(a.id || a.badge || a.type));
                            const merged = [...prev, ...newFromFirestore];
                            localStorage.setItem('gamificationAchievements', JSON.stringify(merged));
                            return merged;
                        });
                    }
                } catch (error) {
                    console.error('Error loading data:', error);
                }
            }

            setIsLoading(false);
        };

        loadData();
    }, [location.key]);

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

    // Fetch AI quiz limit on mount AND when returning from a quiz
    useEffect(() => {
        const fetchLimit = async () => {
            try {
                const limitData = await checkAiQuizLimit();
                setAiQuizLimit(limitData);
            } catch (err) {
                console.warn('Could not fetch AI quiz limit:', err);
            }
        };
        if (auth.currentUser) {
            fetchLimit();
        } else {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) fetchLimit();
            });
            return () => unsubscribe();
        }
    }, [location.key]);

    // Countdown timer for AI quiz reset
    useEffect(() => {
        if (!aiQuizLimit.resetsAt || aiQuizLimit.remaining > 0) {
            setAiCountdown('');
            return;
        }

        const updateCountdown = () => {
            const now = new Date();
            const reset = new Date(aiQuizLimit.resetsAt);
            const diff = reset - now;

            if (diff <= 0) {
                setAiCountdown('Available now!');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setAiCountdown(`Resets in ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [aiQuizLimit.resetsAt, aiQuizLimit.remaining]);

    // Validate quiz config before starting
    const validateQuizConfig = () => {
        if (!selectedSubject) {
            alert('Please select a subject to start the quiz.');
            return false;
        }
        if (!hasPlan) {
            if (!selectedGrade) {
                alert('Please select your grade level.');
                return false;
            }
            if (!selectedTopic) {
                alert('Please select a topic.');
                return false;
            }
        }
        return true;
    };

    // Handle starting AI Quiz
    const handleStartAiQuiz = () => {
        if (!validateQuizConfig()) return;
        navigate('/quiz', {
            state: {
                grade: selectedGrade || studyPlan?.grade || '10',
                subject: selectedSubject,
                topic: selectedTopic,
                numQuestions,
                time: quizTime,
                difficulty,
                source: 'ai'
            }
        });
    };

    // Handle starting Question Bank Quiz
    const handleStartBankQuiz = () => {
        if (!validateQuizConfig()) return;
        navigate('/quiz', {
            state: {
                grade: selectedGrade || studyPlan?.grade || '10',
                subject: selectedSubject,
                topic: selectedTopic,
                numQuestions,
                time: quizTime,
                difficulty,
                source: 'bank'
            }
        });
    };


    // Get badges with unlock status — matches against both badge id and achievement type
    const getBadges = () => {
        const unlockedIds = achievements.map(a => a.id || a.type || a.badge);
        return allBadges.map(badge => ({
            ...badge,
            unlocked: unlockedIds.includes(badge.id)
        }));
    };

    // Get categorized badges with unlock status for the modal
    const getCategorizedBadges = () => {
        const unlockedIds = achievements.map(a => a.id || a.type || a.badge);
        return badgeCategories.map(category => ({
            ...category,
            badges: category.badges.map(badge => ({
                ...badge,
                unlocked: unlockedIds.includes(badge.id)
            })),
            unlockedCount: category.badges.filter(b => unlockedIds.includes(b.id)).length
        }));
    };

    const handleViewAllAchievements = () => {
        setShowAllAchievements(true);
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
                        <span className="header-title">{t('app_name')}</span>
                    </div>
                    <div className="header-right">
                        <span className="level-badge">{t('gamification_level')} {currentLevel.level}</span>
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
                                <h2>{t('gamification_progress')}</h2>
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
                            <h2>{t('gamification_title')}</h2>

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

                                        {/* Time Duration — options scale with question count */}
                                        <div className="quiz-config-section">
                                            <label className="quiz-config-label">Time Duration</label>
                                            <select
                                                className="quiz-dropdown"
                                                value={quizTime}
                                                onChange={(e) => setQuizTime(Number(e.target.value))}
                                            >
                                                {(() => {
                                                    // ~1 min per question baseline, offer range from 1x to 3x
                                                    const minTime = Math.max(1, numQuestions);
                                                    const maxTime = numQuestions * 3;
                                                    const allOptions = [1, 2, 3, 5, 8, 10, 15, 20, 25, 30, 45, 60];
                                                    const validOptions = allOptions.filter(t => t >= minTime && t <= maxTime);
                                                    // Ensure at least the baseline is available
                                                    if (!validOptions.includes(minTime)) validOptions.unshift(minTime);
                                                    return validOptions.map(t => (
                                                        <option key={t} value={t}>{t} minute{t !== 1 ? 's' : ''}</option>
                                                    ));
                                                })()}
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

                            {/* Quiz Type Selection */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                {/* AI Quiz Button */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <button
                                        className="enter-quiz-btn"
                                        onClick={handleStartAiQuiz}
                                        disabled={!selectedSubject || (!hasPlan && (!selectedGrade || !selectedTopic)) || aiQuizLimit.remaining <= 0}
                                        style={{
                                            width: '100%',
                                            background: aiQuizLimit.remaining <= 0
                                                ? 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'
                                                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            opacity: aiQuizLimit.remaining <= 0 ? 0.7 : 1,
                                            cursor: aiQuizLimit.remaining <= 0 ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        🤖 AI Quiz
                                    </button>
                                    <div style={{
                                        fontSize: '0.72rem',
                                        marginTop: '6px',
                                        color: aiQuizLimit.remaining <= 0 ? '#f87171' : '#818cf8',
                                        textAlign: 'center',
                                        fontWeight: 500
                                    }}>
                                        {aiQuizLimit.remaining > 0
                                            ? `${aiQuizLimit.remaining}/${aiQuizLimit.limit} remaining today`
                                            : aiCountdown || 'Limit reached'
                                        }
                                    </div>
                                </div>

                                {/* Question Bank Button */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <button
                                        className="enter-quiz-btn"
                                        onClick={handleStartBankQuiz}
                                        disabled={!selectedSubject || (!hasPlan && (!selectedGrade || !selectedTopic))}
                                        style={{
                                            width: '100%',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                        }}
                                    >
                                        📚 Question Bank
                                    </button>
                                    <div style={{
                                        fontSize: '0.72rem',
                                        marginTop: '6px',
                                        color: '#4ade80',
                                        textAlign: 'center',
                                        fontWeight: 500
                                    }}>
                                        Unlimited • 450+ questions
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Achievements */}
                        <div className="card achievements-card">
                            <div className="achievements-header">
                                <h2>{t('gamification_achievements')}</h2>
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

                        {/* Badge Collection — show first 8 */}
                        <div className="card badges-card">
                            <div className="badges-header">
                                <h2>{t('gamification_badges')}</h2>
                                <span className="badges-progress">Progress: {unlockedCount}/{badges.length}</span>
                            </div>
                            <div className="badges-grid">
                                {badges.slice(0, 8).map((badge, index) => (
                                    <div
                                        key={index}
                                        className={`badge-item ${badge.unlocked ? 'unlocked' : 'locked'}`}
                                        title={badge.description}
                                    >
                                        <div className="badge-icon">{badge.icon}</div>
                                        <span className="badge-name">{badge.name}</span>
                                    </div>
                                ))}
                            </div>
                            {badges.length > 8 && (
                                <button className="view-all-badges-btn" onClick={handleViewAllAchievements}>
                                    View All {badges.length} Badges →
                                </button>
                            )}
                        </div>

                        {/* Active Challenges */}
                        <div className="card challenges-card">
                            <h2>{t('gamification_daily_challenge')}</h2>
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

            {/* All Achievements Modal */}
            {showAllAchievements && (
                <div className="achievements-modal-overlay" onClick={() => setShowAllAchievements(false)}>
                    <div className="achievements-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="achievements-modal-header">
                            <div>
                                <h2>🏅 All Achievements</h2>
                                <p className="achievements-modal-subtitle">
                                    {unlockedCount} of {badges.length} unlocked
                                </p>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowAllAchievements(false)}>×</button>
                        </div>

                        {/* Overall progress bar */}
                        <div className="achievements-overall-progress">
                            <div className="achievements-progress-bar">
                                <div
                                    className="achievements-progress-fill"
                                    style={{ width: `${badges.length > 0 ? (unlockedCount / badges.length) * 100 : 0}%` }}
                                />
                            </div>
                            <span className="achievements-progress-text">
                                {badges.length > 0 ? Math.round((unlockedCount / badges.length) * 100) : 0}% Complete
                            </span>
                        </div>

                        <div className="achievements-modal-content">
                            {getCategorizedBadges().map((category, catIndex) => (
                                <div key={catIndex} className="achievement-category">
                                    <div className="category-header">
                                        <span className="category-icon">{category.icon}</span>
                                        <h3>{category.name}</h3>
                                        <span className="category-progress">
                                            {category.unlockedCount}/{category.badges.length}
                                        </span>
                                    </div>
                                    <div className="category-badges-grid">
                                        {category.badges.map((badge, badgeIndex) => (
                                            <div
                                                key={badgeIndex}
                                                className={`category-badge-item ${badge.unlocked ? 'unlocked' : 'locked'}`}
                                            >
                                                <div className="category-badge-icon">
                                                    {badge.icon}
                                                </div>
                                                <div className="category-badge-info">
                                                    <span className="category-badge-name">{badge.name}</span>
                                                    <span className="category-badge-desc">{badge.description}</span>
                                                </div>
                                                {badge.unlocked ? (
                                                    <span className="badge-status unlocked">✓</span>
                                                ) : (
                                                    <span className="badge-status locked">🔒</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gamification;
