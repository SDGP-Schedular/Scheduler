import React, { useState, useEffect } from 'react';
import './QuizLimitModal.css';

/**
 * QuizLimitModal — shown when user exceeds daily AI quiz limit (3/day).
 * Displays a countdown timer and offers question bank quiz or return option.
 */
const QuizLimitModal = ({ resetsAt, onTryBank, onClose }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const updateCountdown = () => {
            if (!resetsAt) {
                setTimeLeft('--:--:--');
                return;
            }

            const now = new Date();
            const reset = new Date(resetsAt);
            const diff = reset - now;

            if (diff <= 0) {
                setTimeLeft('00:00:00');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            );
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [resetsAt]);

    return (
        <div className="quiz-limit-overlay" onClick={onClose}>
            <div className="quiz-limit-modal" onClick={e => e.stopPropagation()}>
                <div className="quiz-limit-icon">🤖</div>
                <h2>AI Quiz Limit Reached</h2>
                <p className="quiz-limit-message">
                    You've used all 3 AI-generated quizzes for today.
                    Don't worry — you can still practice with our question bank!
                </p>

                <div className="quiz-limit-countdown">
                    <div className="quiz-limit-countdown-label">AI quizzes reset in</div>
                    <div className="quiz-limit-countdown-timer">{timeLeft}</div>
                </div>

                <div className="quiz-limit-actions">
                    <button
                        className="quiz-limit-btn-primary"
                        onClick={onTryBank}
                    >
                        📚 Try Question Bank Quiz
                    </button>
                    <button
                        className="quiz-limit-btn-secondary"
                        onClick={onClose}
                    >
                        ← Return to Gamification
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuizLimitModal;
