import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { generateQuiz, generateBankQuiz, shuffleOptions, trackUsedQuestions, filterRecentQuestions } from '../../services/quizService';
import { useLanguage } from '../../i18n/LanguageContext';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './Quiz.css';

const Quiz = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const quizConfig = location.state || {};
    const { t } = useLanguage();

    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [currentTip, setCurrentTip] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [quizSource, setQuizSource] = useState(null); // 'ai' or 'bank'

    // Stable reference to quiz config to prevent infinite re-renders
    const stableConfig = useMemo(() => quizConfig, []);

    const proTips = [
        "Take your time to read each option carefully. There's no rush!",
        "Process of elimination can help narrow down the choices.",
        "Read the question twice before selecting your answer.",
        "Don't second-guess yourself too much. Trust your knowledge!",
        "Skip difficult questions and come back to them later.",
        "Look for keywords in the question that match the options."
    ];

    // Load questions function (extracted for retry support)
    const loadQuestions = useCallback(async () => {
        try {
            const { grade, subject, topic, numQuestions = 10, difficulty, source } = stableConfig;

            if (!subject) {
                navigate('/gamification');
                return;
            }

            setIsLoading(true);
            setLoadingError(null);

            let generatedQuestions;

            if (source === 'bank') {
                // User chose question bank (from limit modal or direct)
                generatedQuestions = await generateBankQuiz({
                    subject,
                    topic: topic || 'General',
                    difficulty,
                    numQuestions
                });
                setQuizSource('bank');
            } else {
                // Normal AI quiz generation — with 10s timeout fallback to bank
                try {
                    const aiTimeout = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('AI_TIMEOUT')), 10000)
                    );

                    const result = await Promise.race([
                        generateQuiz({
                            grade,
                            subject,
                            topic: topic || 'General',
                            difficulty,
                            numQuestions
                        }),
                        aiTimeout
                    ]);
                    generatedQuestions = result.questions;
                    setQuizSource(result.source || 'ai');
                } catch (aiError) {
                    // If AI limit reached, navigate back to gamification
                    if (aiError.code === 'AI_LIMIT_REACHED') {
                        navigate('/gamification', {
                            state: { limitReached: true }
                        });
                        return;
                    }

                    // AI timed out or failed — fall back to question bank
                    console.warn('⚠️ AI quiz slow/failed, loading from question bank:', aiError.message);
                    generatedQuestions = await generateBankQuiz({
                        subject,
                        topic: topic || 'General',
                        difficulty,
                        numQuestions
                    });
                    setQuizSource('bank');
                }
            }

            // Filter out recently used questions (for bank quizzes and bank fallbacks)
            generatedQuestions = filterRecentQuestions(generatedQuestions);

            // Take only the requested number of questions
            generatedQuestions = generatedQuestions.slice(0, numQuestions);

            // Track these questions so they won't repeat in the next 3 quizzes
            trackUsedQuestions(generatedQuestions);

            // Shuffle options for each question
            const shuffledQuestions = generatedQuestions.map(q => shuffleOptions(q));

            setQuestions(shuffledQuestions);
            setTimeLeft((stableConfig.time || 15) * 60);
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading questions:', error);
            setLoadingError(error.message || 'Failed to generate quiz. Please try again.');
            setIsLoading(false);
        }
    }, [stableConfig, navigate]);

    // Load questions on mount
    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    // Retry handler
    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        loadQuestions();
    };

    // Timer countdown
    useEffect(() => {
        if (timeLeft <= 0 || questions.length === 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleQuizComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, questions]);

    // Rotate pro tips
    useEffect(() => {
        const tipInterval = setInterval(() => {
            setCurrentTip(prev => (prev + 1) % proTips.length);
        }, 10000); // Change tip every 10 seconds

        return () => clearInterval(tipInterval);
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleOptionSelect = (optionIndex) => {
        setSelectedOption(optionIndex);
    };

    const handleNextQuestion = () => {
        if (selectedOption === null) {
            alert('Please select an answer before proceeding.');
            return;
        }

        const currentQuestion = questions[currentQuestionIndex];
        const isCorrect = selectedOption === currentQuestion.correctAnswer;

        // Build the updated answer entry
        const newAnswer = {
            selected: selectedOption,
            correct: currentQuestion.correctAnswer,
            isCorrect
        };

        // Compute final values NOW (React setState is async, so state isn't updated yet)
        const updatedAnswers = { ...selectedAnswers, [currentQuestionIndex]: newAnswer };
        const updatedScore = isCorrect ? score + 10 : score;
        const updatedCorrectCount = isCorrect ? correctCount + 1 : correctCount;

        // Store answer in state (for UI updates)
        setSelectedAnswers(updatedAnswers);
        if (isCorrect) {
            setScore(updatedScore);
            setCorrectCount(updatedCorrectCount);
        }

        // Move to next question or complete quiz
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
        } else {
            // Complete quiz with the CORRECT final values (not stale state)
            completeQuiz(updatedScore, updatedCorrectCount, updatedAnswers);
        }
    };

    const handleSkipQuestion = () => {
        // Build the skipped answer entry
        const newAnswer = {
            selected: null,
            correct: questions[currentQuestionIndex].correctAnswer,
            isCorrect: false,
            skipped: true
        };

        const updatedAnswers = { ...selectedAnswers, [currentQuestionIndex]: newAnswer };

        // Store as skipped
        setSelectedAnswers(updatedAnswers);

        // Move to next question or complete quiz
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
        } else {
            completeQuiz(score, correctCount, updatedAnswers);
        }
    };

    const completeQuiz = (finalScore, finalCorrectCount, finalAnswers) => {
        const timeTaken = (quizConfig.time || 15) * 60 - timeLeft;

        navigate('/quiz-results', {
            state: {
                score: finalScore,
                correctCount: finalCorrectCount,
                totalQuestions: questions.length,
                timeTaken,
                answers: finalAnswers,
                questions,
                quizConfig
            }
        });
    };

    const handleQuizComplete = () => {
        // Called by timer expiry — use current state values as-is
        completeQuiz(score, correctCount, selectedAnswers);
    };

    if (isLoading) {
        return (
            <div className="quiz-container">
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>{stableConfig.source === 'bank' ? '📚 Loading Question Bank...' : '🤖 Generating AI Quiz...'}</p>
                    <p className="loading-subtitle" style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '8px' }}>
                        💡 {proTips[currentTip]}
                    </p>
                </div>
            </div>
        );
    }

    if (loadingError) {
        return (
            <div className="quiz-container">
                <div className="error-message">
                    <h2>⚠️ Quiz Generation Failed</h2>
                    <p>{loadingError}</p>
                    {retryCount > 0 && <p className="retry-count">Attempt {retryCount + 1}</p>}
                    <div className="error-actions">
                        <button
                            className="quiz-btn retry-btn primary"
                            onClick={handleRetry}
                        >
                            🔄 Try Again
                        </button>
                        <button
                            className="quiz-btn retry-btn"
                            onClick={() => navigate('/gamification')}
                        >
                            {t('quiz_return')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="quiz-container">
                <div className="error-message">
                    <h2>No Questions Generated</h2>
                    <p>Unable to generate quiz questions. Please try again.</p>
                    <button
                        className="quiz-btn retry-btn"
                        onClick={() => navigate('/gamification')}
                    >
                        {t('quiz_return')}
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <div className="quiz-container">
            <div className="quiz-content">
                {/* Header */}
                <header className="quiz-header">
                    <div className="quiz-header-left">
                        <img src={schedulerLogo} alt="Scheduler" className="quiz-logo" />
                        <h1 className="quiz-title">{t('quiz_title')}</h1>
                    </div>
                    <button className="quiz-exit-btn" onClick={() => navigate('/gamification')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </header>

                {/* Description */}
                <p className="quiz-description">
                    Test your knowledge with our interactive quiz! Answer questions correctly to earn points and unlock achievements.
                </p>

                {/* Quiz Source Badge */}
                {quizSource && (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: quizSource === 'ai' ? 'rgba(99,102,241,0.12)' : 'rgba(34,197,94,0.12)',
                        border: `1px solid ${quizSource === 'ai' ? 'rgba(99,102,241,0.25)' : 'rgba(34,197,94,0.25)'}`,
                        borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem',
                        color: quizSource === 'ai' ? '#818cf8' : '#4ade80', fontWeight: 500, marginBottom: '12px'
                    }}>
                        {quizSource === 'ai' ? '🤖 AI Generated' : '📚 Question Bank'}
                    </div>
                )}

                {/* Score Cards */}
                <div className="score-cards">
                    <div className="score-card">
                        <div className="score-card-icon purple">🏆</div>
                        <div className="score-card-content">
                            <div className="score-card-value">{score}</div>
                            <div className="score-card-label">{t('quiz_score')}</div>
                        </div>
                    </div>
                    <div className="score-card">
                        <div className="score-card-icon green">✓</div>
                        <div className="score-card-content">
                            <div className="score-card-value">{correctCount}</div>
                            <div className="score-card-label">{t('quiz_correct')}</div>
                        </div>
                    </div>
                    <div className="score-card">
                        <div className="score-card-icon orange">⏱</div>
                        <div className="score-card-content">
                            <div className={`score-card-value ${timeLeft < 60 ? 'low-time' : ''}`}>
                                {formatTime(timeLeft)}
                            </div>
                            <div className="score-card-label">{t('quiz_time_left')}</div>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div className="quiz-progress-section">
                    <div className="quiz-progress-text">
                        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                        <span className="quiz-progress-percent">Complete {Math.round(progress)}%</span>
                    </div>
                    <div className="quiz-progress-bar">
                        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Question Card */}
                <div className="question-card">
                    <div className="question-header">
                        <div className="question-icon">?</div>
                        <div className="question-subject-badge">{currentQuestion.subject}</div>
                    </div>
                    <h2 className="question-text">{currentQuestion.question}</h2>

                    {/* Answer Options */}
                    <div className="answer-options">
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                className={`answer-option ${selectedOption === index ? 'selected' : ''}`}
                                onClick={() => handleOptionSelect(index)}
                            >
                                <span className="option-letter">
                                    {String.fromCharCode(65 + index)}
                                </span>
                                <span className="option-text">{option}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="quiz-navigation">
                    <button className="quiz-btn next-btn" onClick={handleNextQuestion}>
                        {currentQuestionIndex < questions.length - 1 ? t('quiz_next') : t('quiz_finish')} →
                    </button>
                    <button className="quiz-btn skip-btn" onClick={handleSkipQuestion}>
                        {t('quiz_skip')} ⏩
                    </button>
                </div>

                {/* Pro Tip */}
                <div className="pro-tip">
                    <div className="pro-tip-icon">💡</div>
                    <div className="pro-tip-content">
                        <h3>Pro Tip</h3>
                        <p>{proTips[currentTip]}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Quiz;
