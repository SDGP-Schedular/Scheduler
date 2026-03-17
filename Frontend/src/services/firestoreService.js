// Firestore Database Service
// Handles all database operations for the Scheduler app

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ==================== USER PROFILE ====================

/**
 * Create or update user profile
 */
export const saveUserProfile = async (userId, profileData) => {
    try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            ...profileData,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error saving user profile:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get user profile
 */
export const getUserProfile = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            return { success: true, data: docSnap.data() };
        } else {
            return { success: true, data: null };
        }
    } catch (error) {
        console.error('Error getting user profile:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Initialize new user profile on first sign-up
 */
export const initializeUserProfile = async (userId, email) => {
    try {
        const userRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userRef);

        // Only create if doesn't exist
        if (!docSnap.exists()) {
            await setDoc(userRef, {
                email: email,
                displayName: 'User',
                avatar: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
        return { success: true };
    } catch (error) {
        console.error('Error initializing user profile:', error);
        return { success: false, error: error.message };
    }
};

// ==================== STUDY PLAN ====================

/**
 * Save study plan
 */
export const saveStudyPlan = async (userId, studyPlan) => {
    try {
        const planRef = doc(db, 'users', userId, 'data', 'studyPlan');
        await setDoc(planRef, {
            ...studyPlan,
            updatedAt: serverTimestamp()
        });

        // Also save to localStorage as backup/cache
        localStorage.setItem('studyPlan', JSON.stringify(studyPlan));

        return { success: true };
    } catch (error) {
        console.error('Error saving study plan:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get study plan
 */
export const getStudyPlan = async (userId) => {
    try {
        const planRef = doc(db, 'users', userId, 'data', 'studyPlan');
        const docSnap = await getDoc(planRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Update localStorage cache
            localStorage.setItem('studyPlan', JSON.stringify(data));
            return { success: true, data };
        } else {
            // Try to get from localStorage as fallback
            const cached = localStorage.getItem('studyPlan');
            if (cached) {
                return { success: true, data: JSON.parse(cached) };
            }
            return { success: true, data: null };
        }
    } catch (error) {
        console.error('Error getting study plan:', error);
        // Fallback to localStorage
        const cached = localStorage.getItem('studyPlan');
        if (cached) {
            return { success: true, data: JSON.parse(cached) };
        }
        return { success: false, error: error.message };
    }
};

/**
 * Delete study plan
 */
export const deleteStudyPlan = async (userId) => {
    try {
        const planRef = doc(db, 'users', userId, 'data', 'studyPlan');
        await deleteDoc(planRef);
        localStorage.removeItem('studyPlan');
        return { success: true };
    } catch (error) {
        console.error('Error deleting study plan:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Subscribe to study plan changes (real-time)
 */
export const subscribeToStudyPlan = (userId, callback) => {
    const planRef = doc(db, 'users', userId, 'data', 'studyPlan');

    return onSnapshot(planRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            callback(null);
        }
    }, (error) => {
        console.error('Study plan subscription error:', error);
    });
};

// ==================== PROGRESS ====================

/**
 * Save/Update progress
 */
export const saveProgress = async (userId, progressData) => {
    try {
        const progressRef = doc(db, 'users', userId, 'data', 'progress');
        await setDoc(progressRef, {
            ...progressData,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error saving progress:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get progress
 */
export const getProgress = async (userId) => {
    try {
        const progressRef = doc(db, 'users', userId, 'data', 'progress');
        const docSnap = await getDoc(progressRef);

        if (docSnap.exists()) {
            return { success: true, data: docSnap.data() };
        } else {
            // Return default progress
            return {
                success: true,
                data: {
                    completedSessions: 0,
                    studyStreak: 0,
                    xpPoints: 0,
                    lastStudyDate: null
                }
            };
        }
    } catch (error) {
        console.error('Error getting progress:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Reset progress on plan regeneration
 * Clears XP, streak, and completed sessions
 */
export const resetProgress = async (userId) => {
    try {
        const progressRef = doc(db, 'users', userId, 'data', 'progress');
        await setDoc(progressRef, {
            completedSessions: 0,
            studyStreak: 0,
            xpPoints: 0,
            lastStudyDate: null,
            resetAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error resetting progress:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update study streak
 */
export const updateStudyStreak = async (userId) => {
    try {
        const progressRef = doc(db, 'users', userId, 'data', 'progress');
        const docSnap = await getDoc(progressRef);

        const today = new Date().toDateString();
        let newStreak = 1;

        if (docSnap.exists()) {
            const data = docSnap.data();
            const lastDate = data.lastStudyDate?.toDate?.()?.toDateString?.() || null;

            if (lastDate) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                if (lastDate === today) {
                    // Already studied today, keep current streak
                    newStreak = data.studyStreak || 1;
                } else if (lastDate === yesterday.toDateString()) {
                    // Studied yesterday, increment streak
                    newStreak = (data.studyStreak || 0) + 1;
                }
                // Otherwise reset to 1
            }
        }

        await setDoc(progressRef, {
            studyStreak: newStreak,
            lastStudyDate: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });

        return { success: true, streak: newStreak };
    } catch (error) {
        console.error('Error updating study streak:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Add XP points
 */
export const addXpPoints = async (userId, points) => {
    try {
        const progressRef = doc(db, 'users', userId, 'data', 'progress');
        const docSnap = await getDoc(progressRef);

        const currentXp = docSnap.exists() ? (docSnap.data().xpPoints || 0) : 0;

        await setDoc(progressRef, {
            xpPoints: currentXp + points,
            updatedAt: serverTimestamp()
        }, { merge: true });

        return { success: true, totalXp: currentXp + points };
    } catch (error) {
        console.error('Error adding XP:', error);
        return { success: false, error: error.message };
    }
};

// ==================== CHAT HISTORY ====================

/**
 * Save chat session
 */
export const saveChatSession = async (userId, chatData) => {
    try {
        const chatRef = doc(db, 'users', userId, 'chatHistory', chatData.id.toString());
        await setDoc(chatRef, {
            ...chatData,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error saving chat session:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get chat history
 */
export const getChatHistory = async (userId, maxItems = 10) => {
    try {
        const chatsRef = collection(db, 'users', userId, 'chatHistory');
        const q = query(chatsRef, orderBy('createdAt', 'desc'), limit(maxItems));
        const querySnapshot = await getDocs(q);

        const chats = [];
        querySnapshot.forEach((doc) => {
            chats.push({ id: doc.id, ...doc.data() });
        });

        return { success: true, data: chats };
    } catch (error) {
        console.error('Error getting chat history:', error);
        return { success: false, error: error.message };
    }
};

// ==================== NOTIFICATION LOGS ====================

/**
 * Get recent notification logs for a user
 */
export const getNotificationLogs = async (userId, maxItems = 10) => {
    try {
        const logsRef = collection(db, 'users', userId, 'notificationLogs');
        const q = query(logsRef, orderBy('sentAt', 'desc'), limit(maxItems));
        const querySnapshot = await getDocs(q);

        const logs = [];
        querySnapshot.forEach((doc) => {
            logs.push({ id: doc.id, ...doc.data() });
        });

        return { success: true, data: logs };
    } catch (error) {
        console.error('Error getting notification logs:', error);
        return { success: false, error: error.message };
    }
};

// ==================== STUDY PLAN HISTORY ====================

/**
 * Archive current study plan to history before creating a new one
 */
export const archiveCurrentPlan = async (userId) => {
    try {
        // Get current plan
        const planRef = doc(db, 'users', userId, 'data', 'studyPlan');
        const docSnap = await getDoc(planRef);

        if (!docSnap.exists()) {
            return { success: true, archived: false };
        }

        const currentPlan = docSnap.data();

        // Create archive entry with unique ID
        const archiveId = Date.now().toString();
        const archiveRef = doc(db, 'users', userId, 'planHistory', archiveId);

        await setDoc(archiveRef, {
            ...currentPlan,
            archivedAt: serverTimestamp(),
            archiveId: archiveId
        });

        return { success: true, archived: true, archiveId };
    } catch (error) {
        console.error('Error archiving study plan:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get study plan history
 */
export const getPlanHistory = async (userId, maxItems = 10) => {
    try {
        const historyRef = collection(db, 'users', userId, 'planHistory');
        const q = query(historyRef, orderBy('archivedAt', 'desc'), limit(maxItems));
        const querySnapshot = await getDocs(q);

        const plans = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Serialize Firestore Timestamps to ISO strings for safe localStorage caching
            if (data.archivedAt?.toDate) {
                data.archivedAt = data.archivedAt.toDate().toISOString();
            }
            if (data.createdAt?.toDate) {
                data.createdAt = data.createdAt.toDate().toISOString();
            }
            if (data.updatedAt?.toDate) {
                data.updatedAt = data.updatedAt.toDate().toISOString();
            }
            plans.push({ id: doc.id, ...data });
        });

        return { success: true, data: plans };
    } catch (error) {
        console.error('Error getting plan history:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Restore a plan from history
 */
export const restorePlan = async (userId, planData) => {
    try {
        // Archive current plan in background (non-blocking for faster restore)
        archiveCurrentPlan(userId).catch(err =>
            console.warn('Could not archive current plan (may not exist):', err)
        );

        // Now set the restored plan as current
        const planRef = doc(db, 'users', userId, 'data', 'studyPlan');

        // Remove archive-specific fields (id is added by local archive, archiveId by Firestore)
        const { archivedAt, archiveId, id, ...planToRestore } = planData;

        await setDoc(planRef, {
            ...planToRestore,
            restoredAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Update localStorage
        localStorage.setItem('studyPlan', JSON.stringify(planToRestore));

        return { success: true, plan: planToRestore };
    } catch (error) {
        console.error('Error restoring plan:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete a plan from history
 */
export const deletePlanFromHistory = async (userId, archiveId) => {
    try {
        const archiveRef = doc(db, 'users', userId, 'planHistory', archiveId);
        await deleteDoc(archiveRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting plan from history:', error);
        return { success: false, error: error.message };
    }
};

// ==================== ACHIEVEMENTS ====================

/**
 * Save achievement (achievements are never deleted, only added)
 */
export const saveAchievement = async (userId, achievement) => {
    try {
        const achievementId = achievement.id || Date.now().toString();
        const achievementRef = doc(db, 'users', userId, 'achievements', achievementId);

        await setDoc(achievementRef, {
            ...achievement,
            id: achievementId,
            unlockedAt: serverTimestamp()
        }, { merge: true });

        return { success: true, achievementId };
    } catch (error) {
        console.error('Error saving achievement:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get all achievements (never expires even if plan changes)
 */
export const getAchievements = async (userId) => {
    try {
        const achievementsRef = collection(db, 'users', userId, 'achievements');
        let querySnapshot;

        try {
            // Try ordered query first
            const q = query(achievementsRef, orderBy('unlockedAt', 'desc'));
            querySnapshot = await getDocs(q);
        } catch (orderError) {
            // Fallback: unordered query (handles mixed Timestamp/string unlockedAt)
            console.warn('Ordered achievements query failed, using unordered:', orderError.message);
            querySnapshot = await getDocs(achievementsRef);
        }

        const achievements = [];
        querySnapshot.forEach((doc) => {
            achievements.push({ id: doc.id, ...doc.data() });
        });

        return { success: true, data: achievements };
    } catch (error) {
        console.error('Error getting achievements:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check and unlock achievement (only if not already unlocked)
 */
export const unlockAchievement = async (userId, achievementType, achievementData) => {
    try {
        const achievementRef = doc(db, 'users', userId, 'achievements', achievementType);
        const docSnap = await getDoc(achievementRef);

        // Only save if not already unlocked
        if (!docSnap.exists()) {
            await setDoc(achievementRef, {
                ...achievementData,
                type: achievementType,
                unlockedAt: serverTimestamp()
            });
            return { success: true, newUnlock: true };
        }

        return { success: true, newUnlock: false };
    } catch (error) {
        console.error('Error unlocking achievement:', error);
        return { success: false, error: error.message };
    }
};

// ==================== CALENDAR EVENTS ====================

/**
 * Save a calendar event
 */
export const saveCalendarEvent = async (userId, eventData) => {
    try {
        const eventRef = doc(db, 'users', userId, 'calendarEvents', eventData.id);
        await setDoc(eventRef, {
            ...eventData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error saving calendar event:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get all calendar events for a user
 */
export const getCalendarEvents = async (userId) => {
    try {
        const eventsRef = collection(db, 'users', userId, 'calendarEvents');
        const q = query(eventsRef, orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);

        const events = [];
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });

        return { success: true, data: events };
    } catch (error) {
        console.error('Error getting calendar events:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = async (userId, eventId) => {
    try {
        const eventRef = doc(db, 'users', userId, 'calendarEvents', eventId);
        await deleteDoc(eventRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting calendar event:', error);
        return { success: false, error: error.message };
    }
};

// ==================== SETTINGS ====================

/**
 * Save user settings/preferences
 */
export const saveSettings = async (userId, settingsData) => {
    try {
        const settingsRef = doc(db, 'users', userId, 'data', 'settings');
        await setDoc(settingsRef, {
            ...settingsData,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Update localStorage
        localStorage.setItem('userSettings', JSON.stringify(settingsData));

        return { success: true };
    } catch (error) {
        console.error('Error saving settings:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get user settings
 */
export const getSettings = async (userId) => {
    try {
        const settingsRef = doc(db, 'users', userId, 'data', 'settings');
        const docSnap = await getDoc(settingsRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('userSettings', JSON.stringify(data));
            return { success: true, data };
        } else {
            // Default settings
            const defaultSettings = {
                dailyReminders: { enabled: true, time: '09:00' },
                breakReminders: { enabled: true, interval: '30' },
                sessionAlerts: { enabled: false, options: ['5_min'] },
                performanceNotifications: { enabled: true, options: ['weekly_summary'] },
                preferences: { sound: true, push: true, email: false },
                quietHours: { enabled: true, start: '22:00', end: '08:00' }
            };
            return { success: true, data: defaultSettings };
        }
    } catch (error) {
        console.error('Error getting settings:', error);
        return { success: false, error: error.message };
    }
};

// ==================== QUIZ RESULTS ====================

/**
 * Save quiz result to user's quiz history
 */
export const saveQuizResult = async (userId, quizData) => {
    try {
        const quizHistoryRef = collection(db, 'users', userId, 'quizHistory');
        const quizDoc = doc(quizHistoryRef);

        await setDoc(quizDoc, {
            ...quizData,
            completedAt: serverTimestamp()
        });

        console.log('✅ Quiz result saved successfully');
        return { success: true, id: quizDoc.id };
    } catch (error) {
        console.error('Error saving quiz result:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get quiz history for a user
 */
export const getQuizHistory = async (userId, maxItems = 20) => {
    try {
        const quizHistoryRef = collection(db, 'users', userId, 'quizHistory');
        const q = query(quizHistoryRef, orderBy('completedAt', 'desc'), limit(maxItems));
        const querySnapshot = await getDocs(q);

        const quizzes = [];
        querySnapshot.forEach((doc) => {
            quizzes.push({ id: doc.id, ...doc.data() });
        });

        return { success: true, data: quizzes };
    } catch (error) {
        console.error('Error getting quiz history:', error);
        return { success: false, error: error.message };
    }
};
