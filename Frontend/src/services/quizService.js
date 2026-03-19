/**
 * Quiz Service
 * Handles API calls for quiz generation, daily limits, and question bank fallback
 */

import { auth } from '../config/firebase';
import { getFallbackQuestions, cacheAiQuestions } from '../data/fallbackQuestions';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://api.scheduler.it.com/api').replace(/\/$/, '');

// Wait for Firebase auth to finish rehydrating (handles page refresh / cold load)
const waitForAuth = () => {
    return new Promise((resolve, reject) => {
        // If already available, resolve immediately
        if (auth.currentUser) {
            resolve(auth.currentUser);
            return;
        }

        // Otherwise wait for onAuthStateChanged (max 10 seconds)
        const timeout = setTimeout(() => {
            unsubscribe();
            reject(new Error('User not authenticated. Please sign in again.'));
        }, 10000);

        const unsubscribe = auth.onAuthStateChanged((user) => {
            clearTimeout(timeout);
            unsubscribe();
            if (user) {
                resolve(user);
            } else {
                reject(new Error('User not authenticated. Please sign in again.'));
            }
        });
    });
};

/**
 * Get an auth token for API requests
 */
const getAuthToken = async () => {
    const user = await waitForAuth();
    return user.getIdToken(true);
};

/**
 * Check the user's daily AI quiz limit
 * @returns {Promise<Object>} { used, limit, remaining, resetsAt }
 */
export const checkAiQuizLimit = async () => {
    try {
        const idToken = await getAuthToken();

        // Use AbortController for a 3-second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${API_BASE_URL}/quiz/limit`, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok || !data.success) {
            console.warn('⚠️ Could not check AI quiz limit, assuming full quota available');
            return { used: 0, limit: 3, remaining: 3, resetsAt: null, backendDown: true };
        }

        return {
            used: data.used,
            limit: data.limit,
            remaining: data.remaining,
            resetsAt: data.resetsAt
        };
    } catch (error) {
        console.warn('⚠️ Error checking quiz limit:', error.message);
        return { used: 0, limit: 3, remaining: 3, resetsAt: null, backendDown: true };
    }
};

/**
 * Generate quiz from the question bank only (no AI, no daily limit consumed)
 * @param {Object} params - Quiz parameters
 * @returns {Promise<Array>} Array of question objects
 */
export const generateBankQuiz = async ({ subject, topic, difficulty, numQuestions }) => {
    try {
        const idToken = await getAuthToken();

        const response = await fetch(`${API_BASE_URL}/quiz/generate-bank`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                subject,
                topic: topic || 'General',
                difficulty,
                numQuestions
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log(`📚 Bank quiz served: ${data.questions.length} questions`);
            return data.questions;
        }

        throw new Error(data.error || 'Failed to generate bank quiz');
    } catch (error) {
        console.warn('⚠️ Bank quiz API failed, using local fallback:', error.message);

        // Local fallback if even the bank endpoint fails
        const fallbackQuestions = getFallbackQuestions(subject, topic, difficulty, numQuestions);
        if (fallbackQuestions && fallbackQuestions.length > 0) {
            return fallbackQuestions;
        }
        throw new Error('Unable to load quiz questions. Please try again later.');
    }
};

/**
 * Generate quiz questions using AI
 * @param {Object} params - Quiz parameters
 * @returns {Promise<Object>} { questions, source, aiQuizRemaining }
 */
export const generateQuiz = async ({ grade, subject, topic, difficulty, numQuestions }) => {
    try {
        const user = await waitForAuth();

        const makeRequest = async (forceRefresh = false) => {
            const idToken = await user.getIdToken(forceRefresh);

            const response = await fetch(`${API_BASE_URL}/quiz/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    grade: String(grade),
                    subject,
                    topic: topic || 'General',
                    difficulty,
                    numQuestions
                })
            });

            return response;
        };

        // First attempt with force-refreshed token
        let response = await makeRequest(true);

        // If 401, retry once with a brand-new token
        if (response.status === 401) {
            console.warn('Token expired mid-request, retrying with fresh token...');
            response = await makeRequest(true);
        }

        const data = await response.json();

        // Handle AI limit reached — throw special error so UI can show the modal
        if (data.code === 'AI_LIMIT_REACHED') {
            const limitError = new Error('Daily AI quiz limit reached');
            limitError.code = 'AI_LIMIT_REACHED';
            limitError.resetsAt = data.resetsAt;
            limitError.used = data.used;
            limitError.limit = data.limit;
            throw limitError;
        }

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Session expired. Please sign in again.');
            }
            throw new Error(data.error || 'Failed to generate quiz');
        }

        if (!data.success) {
            throw new Error(data.error || 'Quiz generation failed');
        }

        // Cache AI questions into the local question bank for future use
        if (data.questions && data.questions.length > 0 && (data.source || 'ai') === 'ai') {
            cacheAiQuestions(subject, data.questions);
        }

        return {
            questions: data.questions,
            source: data.source || 'ai',
            aiQuizRemaining: data.aiQuizRemaining
        };

    } catch (error) {
        // Re-throw limit errors so the UI can handle them
        if (error.code === 'AI_LIMIT_REACHED') {
            throw error;
        }

        console.warn('⚠️ AI quiz generation failed, using preloaded questions:', error.message);

        // FALLBACK: Use preloaded question bank — students never see errors
        try {
            const fallbackQuestions = getFallbackQuestions(subject, topic, difficulty, numQuestions);

            if (fallbackQuestions && fallbackQuestions.length > 0) {
                console.log(`📦 Serving ${fallbackQuestions.length} preloaded questions for ${subject}`);
                return {
                    questions: fallbackQuestions,
                    source: 'bank',
                    aiQuizRemaining: null
                };
            }
        } catch (fallbackError) {
            console.error('❌ Fallback question bank also failed:', fallbackError.message);
        }

        throw new Error('Unable to load quiz questions. Please try again later.');
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

// ========== QUESTION NON-REPEAT TRACKING ==========

const RECENT_QUESTIONS_KEY = 'recentQuizQuestions';
const MAX_QUIZ_HISTORY = 3; // Don't repeat questions from the last 3 quizzes

/**
 * Generate a simple hash for a question (used for dedup)
 */
const hashQuestion = (q) => {
    // Use question text as the unique identifier
    return (q.question || '').trim().toLowerCase().substring(0, 80);
};

/**
 * Get the set of recently used question hashes
 * @returns {Set<string>}
 */
export const getRecentlyUsedQuestions = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(RECENT_QUESTIONS_KEY) || '[]');
        // stored is an array of arrays (one per quiz)
        const allHashes = stored.flat();
        return new Set(allHashes);
    } catch {
        return new Set();
    }
};

/**
 * Track questions used in a quiz (call after quiz loads)
 * @param {Array} questions - Array of question objects
 */
export const trackUsedQuestions = (questions) => {
    try {
        const stored = JSON.parse(localStorage.getItem(RECENT_QUESTIONS_KEY) || '[]');
        const newHashes = questions.map(hashQuestion);

        // Add this quiz's hashes and keep only the last N quizzes
        stored.push(newHashes);
        while (stored.length > MAX_QUIZ_HISTORY) {
            stored.shift(); // Remove oldest quiz
        }

        localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(stored));
        console.log(`📝 Tracked ${newHashes.length} questions. History: ${stored.length} quizzes.`);
    } catch (err) {
        console.warn('Could not track used questions:', err);
    }
};

/**
 * Filter out recently used questions from a set of questions
 * @param {Array} questions - Array of question objects
 * @returns {Array} Filtered questions (non-repeated ones)
 */
export const filterRecentQuestions = (questions) => {
    const recentHashes = getRecentlyUsedQuestions();
    if (recentHashes.size === 0) return questions;

    const filtered = questions.filter(q => !recentHashes.has(hashQuestion(q)));

    // If filtering would leave us with too few questions, return originals
    if (filtered.length < Math.min(5, questions.length)) {
        console.log('⚠️ Not enough non-repeated questions, using all available.');
        return questions;
    }

    console.log(`🔄 Filtered ${questions.length - filtered.length} repeated questions.`);
    return filtered;
};
