/**
 * Quiz Service
 * Handles API calls for quiz generation
 */

import { auth } from '../config/firebase';

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Generate quiz questions using AI
 * @param {Object} params - Quiz parameters
 * @param {string} params.grade - Grade level (e.g., "10", "13")
 * @param {string} params.subject - Subject name
 * @param {string} params.topic - Specific topic
 * @param {string} params.difficulty - Difficulty level
 * @param {number} params.numQuestions - Number of questions
 * @returns {Promise<Array>} Array of question objects
 */
export const generateQuiz = async ({ grade, subject, topic, difficulty, numQuestions }) => {
    try {
        // Get current user's ID token
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const idToken = await user.getIdToken();

        // Make API request
        const response = await fetch(`${API_BASE_URL}/quiz/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                grade: String(grade),
                subject,
                topic: topic || 'General',  // Default to 'General' if no topic
                difficulty,
                numQuestions
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate quiz');
        }

        if (!data.success) {
            throw new Error(data.error || 'Quiz generation failed');
        }

        return data.questions;

    } catch (error) {
        console.error('Error generating quiz:', error);
        throw error;
    }
};

/**
 * Shuffle options in a question and update correct answer index
 * @param {Object} question - Question object
 * @returns {Object} Question with shuffled options
 */
export const shuffleOptions = (question) => {
    const questionCopy = { ...question };
    const indexes = [0, 1, 2, 3];

    // Fisher-Yates shuffle
    for (let i = indexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }

    // Reorder options and update correct answer
    const newOptions = indexes.map(i => question.options[i]);
    const newCorrectAnswer = indexes.indexOf(question.correctAnswer);

    questionCopy.options = newOptions;
    questionCopy.correctAnswer = newCorrectAnswer;

    return questionCopy;
};
