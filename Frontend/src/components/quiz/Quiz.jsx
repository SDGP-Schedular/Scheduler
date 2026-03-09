import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { generateQuiz, shuffleOptions } from '../../services/quizService';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './Quiz.css';

const Quiz = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const quizConfig = location.state || {};

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

    const proTips = [
        "Take your time to read each option carefully. There's no rush!",
        "Process of elimination can help narrow down the choices.",
        "Read the question twice before selecting your answer.",
        "Don't second-guess yourself too much. Trust your knowledge!",
        "Skip difficult questions and come back to them later.",
        "Look for keywords in the question that match the options."
    ];

    // Load questions on mount
    useEffect(() => {
        const loadQuestions = async () => {
            try {
                const { grade, subject, topic, numQuestions = 10, difficulty } = quizConfig;

                if (!subject) {
                    navigate('/gamification');
                    return;
                }

                setIsLoading(true);
                setLoadingError(null);

                // Generate questions using AI
                const generatedQuestions = await generateQuiz({
                    grade,
                    subject,
                    topic: topic || 'General',
                    difficulty,
                    numQuestions
                });

                // Shuffle options for each question
                const shuffledQuestions = generatedQuestions.map(q => shuffleOptions(q));

                setQuestions(shuffledQuestions);
                setTimeLeft((quizConfig.time || 15) * 60); // Convert minutes to seconds
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading questions:', error);
                setLoadingError(error.message || 'Failed to generate quiz. Please try again.');
                setIsLoading(false);
            }
        };

        loadQuestions();
    }, [quizConfig, navigate]);

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

        // Store answer
        setSelectedAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: {
                selected: selectedOption,
                correct: currentQuestion.correctAnswer,
                isCorrect
            }
        }));

        // Update score if correct
        if (isCorrect) {
            setScore(prev => prev + 10);
            setCorrectCount(prev => prev + 1);
        }

        // Move to next question or complete quiz
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
        } else {
            handleQuizComplete();
        }
    };

    const handleSkipQuestion = () => {
        // Store as skipped
        setSelectedAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: {
                selected: null,
                correct: questions[currentQuestionIndex].correctAnswer,
                isCorrect: false,
                skipped: true
            }
        }));

        // Move to next question or complete quiz
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
        } else {
            handleQuizComplete();
        }
    };

    const handleQuizComplete = () => {
        // Score and correctCount are already updated, no need to adjust
        const timeTaken = (quizConfig.time || 15) * 60 - timeLeft;

        navigate('/quiz-results', {
            state: {
                score,
                correctCount,
                totalQuestions: questions.length,
                timeTaken,
                answers: selectedAnswers,
                questions,
                quizConfig
            }
        });
    };

    if (isLoading) {
        return (
            <div className="quiz-container">
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>Generating your personalized quiz...</p>
                    <p className="loading-subtitle">This may take a few moments</p>
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
                    <button
                        className="quiz-btn retry-btn"
                        onClick={() => navigate('/gamification')}
                    >
                        Return to Gamification
                    </button>
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
                        Return to Gamification
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
                        <h1 className="quiz-title">Scheduler Quiz</h1>
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

                {/* Score Cards */}
                <div className="score-cards">
                    <div className="score-card">
                        <div className="score-card-icon purple">🏆</div>
                        <div className="score-card-content">
                            <div className="score-card-value">{score}</div>
                            <div className="score-card-label">Score</div>
                        </div>
                    </div>
                    <div className="score-card">
                        <div className="score-card-icon green">✓</div>
                        <div className="score-card-content">
                            <div className="score-card-value">{correctCount}</div>
                            <div className="score-card-label">Correct</div>
                        </div>
                    </div>
                    <div className="score-card">
                        <div className="score-card-icon orange">⏱</div>
                        <div className="score-card-content">
                            <div className={`score-card-value ${timeLeft < 60 ? 'low-time' : ''}`}>
                                {formatTime(timeLeft)}
                            </div>
                            <div className="score-card-label">Time Left</div>
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
                        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'} →
                    </button>
                    <button className="quiz-btn skip-btn" onClick={handleSkipQuestion}>
                        Skip Question ⏩
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
