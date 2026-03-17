import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../config/firebase';
import {
    saveQuizResult,
    saveProgress,
    unlockAchievement,
    getProgress,
    getAchievements,
    updateStudyStreak
} from '../../services/firestoreService';
import schedulerLogo from '../../assets/scheduler-logo.png';
import { useLanguage } from '../../i18n/LanguageContext';
import './QuizResults.css';

const QuizResults = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const resultsData = location.state || {};
    const { t } = useLanguage();
    const [unlockedBadges, setUnlockedBadges] = useState([]);
    const [showBadgeAnimation, setShowBadgeAnimation] = useState(false);
    const didRunRef = useRef(false); // Prevent double-run in React StrictMode

    const {
        score = 0,
        correctCount = 0,
        totalQuestions = 0,
        timeTaken = 0,
        answers = {},
        questions = [],
        quizConfig = {}
    } = resultsData;

    const percentage = totalQuestions > 0 ? parseFloat(((correctCount / totalQuestions) * 100).toFixed(1)) : 0;
    const skippedCount = totalQuestions - Object.keys(answers).filter(key => answers[key].selected !== null).length;
    const incorrectCount = totalQuestions - correctCount - skippedCount;

    // ========== XP CALCULATION (Dynamic based on questions, difficulty, time) ==========
    const calculateXP = () => {
        const numQuestions = totalQuestions;
        const baseXP = numQuestions * 10; // 10 XP per question

        // Difficulty multiplier
        const difficultyMultipliers = {
            'Easy': 0.8,
            'Medium': 1.0,
            'Hard': 1.5,
            'Mixed': 1.2
        };
        const difficulty = quizConfig.difficulty || 'Mixed';
        const difficultyXP = baseXP * (difficultyMultipliers[difficulty] || 1.0);

        // Accuracy bonus
        const accuracyPercent = percentage;
        const accuracyBonus = accuracyPercent >= 100 ? 100 :
            accuracyPercent >= 90 ? 50 :
                accuracyPercent >= 80 ? 25 : 0;

        // Time efficiency bonus (using actual quiz time limit)
        const timeLimit = (quizConfig.time || 15) * 60; // Convert minutes to seconds
        const timeRatio = timeTaken / timeLimit;
        const timeBonus = timeRatio <= 0.5 ? 50 :  // Finished in < 50% of time limit
            timeRatio <= 0.75 ? 25 : // Finished in < 75% of time limit
                timeRatio <= 1.0 ? 10 : 0; // Finished within time limit

        const totalXP = Math.round(difficultyXP + accuracyBonus + timeBonus);
        return {
            total: totalXP,
            breakdown: {
                base: Math.round(difficultyXP),
                accuracy: accuracyBonus,
                time: timeBonus
            }
        };
    };

    const xpData = calculateXP();

    // ========== BADGE CHECKING LOGIC ==========
    const checkBadgeConditions = async () => {
        if (!auth.currentUser) return [];

        const newBadges = [];
        const userId = auth.currentUser.uid;

        try {
            // Get current progress and achievements
            const progressResult = await getProgress(userId);
            const achievementsResult = await getAchievements(userId);

            const currentProgress = progressResult.data || { completedSessions: 0 };
            const currentAchievements = achievementsResult.data || [];
            const earnedBadges = currentAchievements.map(a => a.badge);

            const quizCount = (currentProgress.completedSessions || 0) + 1; // Including this quiz
            const quizSubject = quizConfig.subject || '';
            const quizDifficulty = quizConfig.difficulty || 'Mixed';
            const timeLimit = (quizConfig.time || 15) * 60;
            const timeRatio = timeTaken / timeLimit;

            // Helper to check if badge already earned
            const hasBadge = (badgeId) => earnedBadges.includes(badgeId);

            // 🎯 COMPLETION MILESTONES (use >= so badges unlock even if count skips)
            if (!hasBadge('first_steps') && quizCount >= 1) {
                newBadges.push({ badge: 'first_steps', icon: '🎯', name: 'First Steps' });
            }
            if (!hasBadge('dedicated_learner') && quizCount >= 5) {
                newBadges.push({ badge: 'dedicated_learner', icon: '📚', name: 'Dedicated Learner' });
            }
            if (!hasBadge('quiz_enthusiast') && quizCount >= 10) {
                newBadges.push({ badge: 'quiz_enthusiast', icon: '⭐', name: 'Quiz Enthusiast' });
            }
            if (!hasBadge('quiz_master') && quizCount >= 25) {
                newBadges.push({ badge: 'quiz_master', icon: '🏆', name: 'Quiz Master' });
            }
            if (!hasBadge('quiz_legend') && quizCount >= 50) {
                newBadges.push({ badge: 'quiz_legend', icon: '👑', name: 'Quiz Legend' });
            }
            if (!hasBadge('quiz_deity') && quizCount >= 100) {
                newBadges.push({ badge: 'quiz_deity', icon: '🌟', name: 'Quiz Deity' });
            }

            // 📋 STUDY PLAN BADGE
            const cachedPlan = localStorage.getItem('studyPlan');
            if (!hasBadge('first_plan') && cachedPlan) {
                try {
                    const plan = JSON.parse(cachedPlan);
                    if (plan && plan.subjects && plan.subjects.length > 0) {
                        newBadges.push({ badge: 'first_plan', icon: '📋', name: 'First Plan' });
                    }
                } catch (e) { /* ignore */ }
            }

            // 🏆 PERFORMANCE BADGES
            if (!hasBadge('rising_star') && percentage >= 80) {
                newBadges.push({ badge: 'rising_star', icon: '⭐', name: 'Rising Star' });
            }
            if (!hasBadge('champion') && percentage >= 99.9) {
                newBadges.push({ badge: 'champion', icon: '🏆', name: 'Champion' });
            }
            if (!hasBadge('hard_mode_hero') && quizDifficulty === 'Hard' && percentage >= 80) {
                newBadges.push({ badge: 'hard_mode_hero', icon: '🛡️', name: 'Hard Mode Hero' });
            }
            if (!hasBadge('no_mistakes') && percentage >= 99.9 && totalQuestions >= 20) {
                newBadges.push({ badge: 'no_mistakes', icon: '✨', name: 'No Mistakes' });
            }

            // ⚡ SPEED BADGES (REQUIRES 100% ACCURACY)
            if (percentage >= 99.9) {
                if (!hasBadge('speed_demon') && timeRatio < 0.5) {
                    newBadges.push({ badge: 'speed_demon', icon: '⚡', name: 'Speed Demon' });
                }
                if (!hasBadge('lightning_fast') && timeRatio < 0.3) {
                    newBadges.push({ badge: 'lightning_fast', icon: '⚡️', name: 'Lightning Fast' });
                }
                if (!hasBadge('flash') && timeRatio < 0.25) {
                    newBadges.push({ badge: 'flash', icon: '💫', name: 'Flash' });
                }
                if (!hasBadge('unbeatable') && quizDifficulty === 'Hard' && timeRatio < 0.5) {
                    newBadges.push({ badge: 'unbeatable', icon: '🚀', name: 'Unbeatable' });
                }
                if (!hasBadge('speedrunner') && totalQuestions >= 20 && timeRatio < 0.4) {
                    newBadges.push({ badge: 'speedrunner', icon: '🏃', name: 'Speedrunner' });
                }
            }

            // 🧙‍♂️ SUBJECT MASTERY
            if (percentage >= 90) {
                if (!hasBadge('math_wizard') && (quizSubject.includes('Math') || quizSubject.includes('Combined Mathematics'))) {
                    newBadges.push({ badge: 'math_wizard', icon: '🧙‍♂️', name: 'Math Wizard' });
                }
                if (!hasBadge('science_genius') && (quizSubject.includes('Science') || quizSubject.includes('Physics') || quizSubject.includes('Chemistry'))) {
                    newBadges.push({ badge: 'science_genius', icon: '🔬', name: 'Science Genius' });
                }
                if (!hasBadge('language_expert') && (quizSubject.includes('English') || quizSubject.includes('Sinhala') || quizSubject.includes('Tamil'))) {
                    newBadges.push({ badge: 'language_expert', icon: '📖', name: 'Language Expert' });
                }
                if (!hasBadge('tech_savvy') && (quizSubject.includes('ICT') || quizSubject.includes('Programming'))) {
                    newBadges.push({ badge: 'tech_savvy', icon: '💻', name: 'Tech Savvy' });
                }
                if (!hasBadge('history_buff') && quizSubject.includes('History')) {
                    newBadges.push({ badge: 'history_buff', icon: '📜', name: 'History Buff' });
                }
                if (!hasBadge('commerce_pro') && (quizSubject.includes('Commerce') || quizSubject.includes('Accounting') || quizSubject.includes('Economics'))) {
                    newBadges.push({ badge: 'commerce_pro', icon: '💼', name: 'Commerce Pro' });
                }
            }

            // 🎮 CHALLENGE BADGES
            const currentHour = new Date().getHours();
            if (!hasBadge('night_owl') && currentHour >= 22) {
                newBadges.push({ badge: 'night_owl', icon: '🦉', name: 'Night Owl' });
            }
            if (!hasBadge('early_bird') && currentHour < 7) {
                newBadges.push({ badge: 'early_bird', icon: '🌅', name: 'Early Bird' });
            }
            if (!hasBadge('marathon_runner') && totalQuestions >= 30 && percentage >= 85) {
                newBadges.push({ badge: 'marathon_runner', icon: '🏃‍♂️', name: 'Marathon Runner' });
            }

            return newBadges;
        } catch (error) {
            console.error('Error checking badge conditions:', error);
            return [];
        }
    };

    // Get performance feedback
    const getPerformanceFeedback = () => {
        if (percentage >= 90) return { message: 'Outstanding! You\'re a star! ⭐', color: '#10b981' };
        if (percentage >= 75) return { message: 'Great job! Keep it up! 🎉', color: '#3b82f6' };
        if (percentage >= 60) return { message: 'Good effort! Practice makes perfect! 💪', color: '#f59e0b' };
        if (percentage >= 40) return { message: 'Nice try! Review and try again! 📚', color: '#ef4444' };
        return { message: 'Keep practicing! You\'ll do better next time! 🌟', color: '#8b5cf6' };
    };

    const feedback = getPerformanceFeedback();

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    useEffect(() => {

        // Helper: wrap a promise with a timeout so Firestore doesn't hang forever
        const withTimeout = (promise, ms = 5000, fallbackValue = { success: false, error: 'timeout' }) => {
            return Promise.race([
                promise,
                new Promise(resolve => setTimeout(() => resolve(fallbackValue), ms))
            ]);
        };

        const updateProgressAndBadges = async () => {
            if (didRunRef.current) return;
            didRunRef.current = true;

            if (!auth.currentUser) {
                console.warn('⚠️ No authenticated user — skipping gamification updates');
                return;
            }

            if (!totalQuestions || totalQuestions === 0) {
                console.warn('⚠️ No quiz data — skipping gamification updates');
                return;
            }

            const userId = auth.currentUser.uid;
            console.log('🎮 Starting gamification update for user:', userId);
            console.log('📋 Quiz data:', { score, correctCount, totalQuestions, percentage, xp: xpData.total });

            // ========== STEP 1: INSTANT localStorage update (ALWAYS works, never hangs) ==========
            try {
                // Read current progress from localStorage
                const cachedProgress = JSON.parse(localStorage.getItem('gamificationProgress') || '{}');
                const updatedProgress = {
                    ...cachedProgress,
                    completedSessions: (cachedProgress.completedSessions || 0) + 1,
                    xpPoints: (cachedProgress.xpPoints || 0) + xpData.total,
                    studyStreak: Math.max(cachedProgress.studyStreak || 0, 1), // At least 1 since studying today
                    lastQuizDate: new Date().toISOString()
                };
                localStorage.setItem('gamificationProgress', JSON.stringify(updatedProgress));
                localStorage.setItem('progress', JSON.stringify(updatedProgress));
                console.log('💾 localStorage progress saved instantly:', updatedProgress);

                // Check badges against local data
                const badges = await checkBadgeConditions();
                console.log('🏅 Badges checked:', badges.length, 'new badges');

                if (badges.length > 0) {
                    setUnlockedBadges(badges);
                    setShowBadgeAnimation(true);
                }

                // Update achievements in localStorage
                const existingAchievements = JSON.parse(localStorage.getItem('gamificationAchievements') || '[]');
                const newAchievementEntries = badges.map(b => ({
                    id: b.badge,
                    type: b.badge,
                    badge: b.badge,
                    title: b.name,
                    icon: b.icon,
                    description: b.description || b.name,
                    unlockedAt: new Date().toISOString()
                }));
                const mergedAchievements = [
                    ...newAchievementEntries,
                    ...existingAchievements.filter(a => !badges.some(b => b.badge === (a.id || a.badge)))
                ];
                localStorage.setItem('gamificationAchievements', JSON.stringify(mergedAchievements));
                console.log('💾 localStorage achievements saved:', mergedAchievements.length, 'total');

                console.log('✅ Local gamification data updated successfully!');
            } catch (localError) {
                console.error('❌ Error updating local gamification data:', localError);
            }

            // ========== STEP 2: Firestore sync (BACKGROUND, with timeout — never blocks) ==========
            try {
                const quizResult = {
                    subject: quizConfig.subject || 'Unknown',
                    topic: quizConfig.topic || 'General',
                    difficulty: quizConfig.difficulty || 'Mixed',
                    grade: quizConfig.grade || '',
                    score,
                    correctCount,
                    totalQuestions,
                    timeTaken,
                    timeLimit: (quizConfig.time || 15) * 60,
                    xpEarned: xpData.total,
                    percentage: parseFloat(percentage)
                };

                // All Firestore ops with 5s timeout — if Firestore hangs, we don't care
                const saveResult = await withTimeout(saveQuizResult(userId, quizResult));
                console.log('📝 Firestore quiz result:', saveResult.success ? '✅' : '⏱️ timeout/failed');

                // Read current Firestore progress, compute update, write back
                const progressResult = await withTimeout(getProgress(userId));
                const currentProgress = progressResult.data || {
                    completedSessions: 0,
                    studyStreak: 0,
                    xpPoints: 0
                };

                const firestoreProgress = {
                    ...currentProgress,
                    completedSessions: (currentProgress.completedSessions || 0) + 1,
                    xpPoints: (currentProgress.xpPoints || 0) + xpData.total,
                    lastQuizDate: new Date().toISOString()
                };

                const progressSave = await withTimeout(saveProgress(userId, firestoreProgress));
                console.log('📊 Firestore progress:', progressSave.success ? '✅' : '⏱️ timeout/failed',
                    `Sessions: ${firestoreProgress.completedSessions}, XP: ${firestoreProgress.xpPoints}`);

                // Update study streak — quiz completion counts as studying today
                const streakResult = await withTimeout(updateStudyStreak(userId));
                if (streakResult.success) {
                    console.log('🔥 Streak updated:', streakResult.streak);
                    // Sync streak to localStorage caches
                    const cachedProgress = JSON.parse(localStorage.getItem('gamificationProgress') || '{}');
                    cachedProgress.studyStreak = streakResult.streak;
                    localStorage.setItem('gamificationProgress', JSON.stringify(cachedProgress));
                    localStorage.setItem('progress', JSON.stringify(cachedProgress));
                } else {
                    console.warn('⚠️ Streak update failed/timeout');
                }

                // Unlock badges in Firestore
                const badges = await checkBadgeConditions();
                for (const badge of badges) {
                    const badgeResult = await withTimeout(unlockAchievement(userId, badge.badge, {
                        title: badge.name,
                        icon: badge.icon,
                        badge: badge.badge,
                        description: badge.description || badge.name
                    }));
                    console.log(`🏅 Firestore badge "${badge.name}":`, badgeResult.success ? '✅' : '⏱️ timeout');
                }

                console.log('✅ Firestore sync completed!');
            } catch (firestoreError) {
                console.warn('⚠️ Firestore sync failed (local data is still saved):', firestoreError.message);
            }
        };

        updateProgressAndBadges();
    }, []);

    if (!resultsData.score && resultsData.score !== 0) {
        navigate('/gamification');
        return null;
    }

    return (
        <div className="quiz-results-container">
            <div className="quiz-results-content">
                {/* Header */}
                <header className="quiz-results-header">
                    <img src={schedulerLogo} alt="Scheduler" className="results-logo" />
                    <h1 className="results-title">Quiz Complete! 🎊</h1>
                </header>

                {/* Performance Card */}
                <div className="performance-card">
                    <div className="performance-circle">
                        <svg viewBox="0 0 200 200" className="performance-svg">
                            <circle
                                cx="100"
                                cy="100"
                                r="85"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="12"
                            />
                            <circle
                                cx="100"
                                cy="100"
                                r="85"
                                fill="none"
                                stroke={feedback.color}
                                strokeWidth="12"
                                strokeDasharray={`${(percentage / 100) * 534} 534`}
                                strokeLinecap="round"
                                transform="rotate(-90 100 100)"
                                className="performance-progress"
                            />
                        </svg>
                        <div className="performance-score">
                            <div className="performance-percent">{percentage}%</div>
                            <div className="performance-label">Accuracy</div>
                        </div>
                    </div>
                    <p className="performance-feedback" style={{ color: feedback.color }}>
                        {feedback.message}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon green">✓</div>
                        <div className="stat-content">
                            <div className="stat-value">{correctCount}</div>
                            <div className="stat-label">{t('quiz_correct')}</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon red">✗</div>
                        <div className="stat-content">
                            <div className="stat-value">{incorrectCount}</div>
                            <div className="stat-label">Incorrect</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon orange">⏩</div>
                        <div className="stat-content">
                            <div className="stat-value">{skippedCount}</div>
                            <div className="stat-label">Skipped</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon purple">🏆</div>
                        <div className="stat-content">
                            <div className="stat-value">{score}</div>
                            <div className="stat-label">Points</div>
                        </div>
                    </div>
                </div>

                {/* XP Reward */}
                <div className="xp-reward-card">
                    <div className="xp-reward-content">
                        <div className="xp-icon">⭐</div>
                        <div>
                            <h3>XP Earned</h3>
                            <p>+{xpData.total} experience points</p>
                            <div className="xp-breakdown">
                                <span className="breakdown-item">Base: +{xpData.breakdown.base}</span>
                                {xpData.breakdown.accuracy > 0 && (
                                    <span className="breakdown-item bonus">Accuracy: +{xpData.breakdown.accuracy}</span>
                                )}
                                {xpData.breakdown.time > 0 && (
                                    <span className="breakdown-item bonus">⚡ Speed: +{xpData.breakdown.time}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badge Unlocks */}
                {showBadgeAnimation && unlockedBadges.length > 0 && (
                    <div className="badge-unlock-notification">
                        <h3>🎉 New Badges Unlocked!</h3>
                        <div className="unlocked-badges">
                            {unlockedBadges.map((badge, index) => (
                                <div key={index} className="unlocked-badge">
                                    <span className="badge-icon">{badge.icon}</span>
                                    <span className="badge-name">{badge.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Details */}
                <div className="quiz-details">
                    <div className="detail-item">
                        <span className="detail-label">Subject:</span>
                        <span className="detail-value">{quizConfig.subject || 'N/A'}</span>
                    </div>
                    {quizConfig.topic && (
                        <div className="detail-item">
                            <span className="detail-label">Topic:</span>
                            <span className="detail-value">{quizConfig.topic}</span>
                        </div>
                    )}
                    <div className="detail-item">
                        <span className="detail-label">Total Questions:</span>
                        <span className="detail-value">{totalQuestions}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">{t('quiz_time_taken')}:</span>
                        <span className="detail-value">{formatTime(timeTaken)}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Difficulty:</span>
                        <span className="detail-value">{quizConfig.difficulty || 'Mixed'}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="results-actions">
                    <button className="results-btn primary" onClick={() => navigate('/gamification')}>
                        Take Another Quiz
                    </button>
                    <button className="results-btn secondary" onClick={() => navigate('/dashboard')}>
                        {t('quiz_back_dashboard')}
                    </button>
                </div>

                {/* Review Section */}
                {questions.length > 0 && (
                    <div className="review-section">
                        <h2 className="review-title">{t('quiz_review')}</h2>
                        <div className="review-list">
                            {questions.map((question, index) => {
                                const answer = answers[index] || {};
                                const isCorrect = answer.isCorrect;
                                const wasSkipped = answer.skipped;

                                return (
                                    <div
                                        key={index}
                                        className={`review-item ${isCorrect ? 'correct' : wasSkipped ? 'skipped' : 'incorrect'}`}
                                    >
                                        <div className="review-header">
                                            <span className="review-number">Question {index + 1}</span>
                                            <span className={`review-status ${isCorrect ? 'correct' : wasSkipped ? 'skipped' : 'incorrect'}`}>
                                                {isCorrect ? '✓ Correct' : wasSkipped ? '⏩ Skipped' : '✗ Incorrect'}
                                            </span>
                                        </div>
                                        <p className="review-question">{question.question}</p>
                                        <div className="review-answers">
                                            {!wasSkipped && answer.selected !== null && (
                                                <div className="review-answer-item">
                                                    <span className="review-answer-label">Your answer:</span>
                                                    <span className={`review-answer-text ${!isCorrect ? 'wrong' : ''}`}>
                                                        {String.fromCharCode(65 + answer.selected)}. {question.options[answer.selected]}
                                                    </span>
                                                </div>
                                            )}
                                            {!isCorrect && (
                                                <div className="review-answer-item">
                                                    <span className="review-answer-label">Correct answer:</span>
                                                    <span className="review-answer-text correct">
                                                        {String.fromCharCode(65 + answer.correct)}. {question.options[answer.correct]}
                                                    </span>
                                                </div>
                                            )}
                                            {question.explanation && !isCorrect && (
                                                <div className="review-explanation">
                                                    <span className="review-explanation-label">💡 Explanation:</span>
                                                    <p>{question.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizResults;
