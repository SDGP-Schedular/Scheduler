import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import { auth } from '../../config/firebase';
import { getStudyPlan, getPlanHistory, restorePlan, archiveCurrentPlan, unlockAchievement, addXpPoints, resetProgress, deleteStudyPlan, deletePlanFromHistory, saveStudyPlan } from '../../services/firestoreService';
import { getSubjectWeight, calculateStudyTime } from '../../data/subjectsData';
import { useLanguage } from '../../i18n/LanguageContext';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './StudyPlan.css';

const StudyPlan = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [studyPlan, setStudyPlan] = useState(null);
    const [weekDays, setWeekDays] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [planHistory, setPlanHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const contentRef = useRef(null);

    // Time editing state
    const [editingSession, setEditingSession] = useState(null);
    const [customTimes, setCustomTimes] = useState(() => {
        const cached = localStorage.getItem('customSessionTimes');
        return cached ? JSON.parse(cached) : {};
    });

    // Sticky Notes state
    const [showStickyNotes, setShowStickyNotes] = useState(false);
    const [stickySelectedSubject, setStickySelectedSubject] = useState(null);
    const [stickyNoteText, setStickyNoteText] = useState('');
    const [stickyNotes, setStickyNotes] = useState(() => {
        const cached = localStorage.getItem('stickyNotes');
        if (!cached) return {};
        const raw = JSON.parse(cached);
        // Migrate old keys to normalized format (lowercase, trimmed)
        const migrated = {};
        for (const [key, value] of Object.entries(raw)) {
            const [name, topicsStr] = key.split('|');
            const normName = (name || '').trim().toLowerCase();
            const normTopics = (topicsStr || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean).sort().join(',');
            const normKey = `${normName}|${normTopics}`;
            // Keep the most recent note if there's a collision
            if (!migrated[normKey]) migrated[normKey] = value;
        }
        // Write back if different
        if (JSON.stringify(migrated) !== cached) {
            localStorage.setItem('stickyNotes', JSON.stringify(migrated));
        }
        return migrated;
    });

    // Generate a normalized key for sticky notes: lowercase + trim + sorted topics
    const getStickyNoteKey = (subject) => {
        const name = (subject.name || '').trim().toLowerCase();
        const topics = (subject.topics || []).map(t => t.trim().toLowerCase()).sort().join(',');
        return `${name}|${topics}`;
    };

    useEffect(() => {
        const loadStudyPlan = async () => {
            // First try localStorage for immediate display
            const cachedPlan = localStorage.getItem('studyPlan');
            if (cachedPlan) {
                try {
                    const plan = JSON.parse(cachedPlan);
                    setStudyPlan(plan);
                    generateWeekSchedule(plan);
                } catch (e) {
                    console.error('Error parsing cached plan:', e);
                }
            }

            // Then load from Firestore if user is logged in
            if (auth.currentUser) {
                try {
                    const result = await getStudyPlan(auth.currentUser.uid);
                    if (result.success && result.data) {
                        setStudyPlan(result.data);
                        generateWeekSchedule(result.data);
                    } else if (!cachedPlan) {
                        navigate('/scheduling');
                    }
                } catch (error) {
                    console.error('Error loading from Firestore:', error);
                    if (!cachedPlan) {
                        navigate('/scheduling');
                    }
                }
            } else if (!cachedPlan) {
                navigate('/scheduling');
            }
        };

        loadStudyPlan();
    }, [navigate]);

    // Preload plan history in background for faster modal display
    useEffect(() => {
        if (auth.currentUser) {
            loadPlanHistory();
        }
    }, []);

    // Subject colors and icons mapping
    const subjectStyles = {
        'Mathematics': { bg: '#DBEAFE', color: '#2563EB', icon: '📊' },
        'Combined Mathematics': { bg: '#DBEAFE', color: '#2563EB', icon: '📊' },
        'Physics': { bg: '#FEE2E2', color: '#DC2626', icon: '🔬' },
        'Chemistry': { bg: '#FEF3C7', color: '#D97706', icon: '⚗️' },
        'Biology': { bg: '#D1FAE5', color: '#059669', icon: '🧬' },
        'English': { bg: '#F3E8FF', color: '#7C3AED', icon: '📚' },
        'Programming': { bg: '#CFFAFE', color: '#0891B2', icon: '</>' },
        'ICT': { bg: '#CFFAFE', color: '#0891B2', icon: '💻' },
        'Science': { bg: '#FEE2E2', color: '#DC2626', icon: '🔬' },
        'History': { bg: '#FEF3C7', color: '#D97706', icon: '📜' },
        'Geography': { bg: '#D1FAE5', color: '#059669', icon: '🌍' },
        'Sinhala': { bg: '#E0E7FF', color: '#4F46E5', icon: '📖' },
        'Tamil': { bg: '#E0E7FF', color: '#4F46E5', icon: '📖' },
        'Commerce': { bg: '#FCE7F3', color: '#DB2777', icon: '💼' },
        'Accounting': { bg: '#FCE7F3', color: '#DB2777', icon: '📈' },
        'Economics': { bg: '#FEF3C7', color: '#D97706', icon: '📉' },
        'default': { bg: '#F3F4F6', color: '#6B7280', icon: '📚' }
    };

    const getSubjectStyle = (subjectName) => {
        return subjectStyles[subjectName] || subjectStyles['default'];
    };

    // Generate weekly schedule from study plan
    const generateWeekSchedule = (plan) => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start from Monday

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const schedule = days.map((dayName, index) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + index);

            return {
                name: dayName,
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                sessions: index < 6 ? generateDaySessions(plan, index) : [], // Sunday is rest day
                isRestDay: index === 6
            };
        });

        setWeekDays(schedule);
    };

    // Generate sessions for a specific day
    const generateDaySessions = (plan, dayIndex) => {
        if (!plan.subjects || plan.subjects.length === 0) return [];

        const sessions = [];
        const prefs = plan.preferences;
        const timeSlots = getTimeSlots(
            prefs.preferredTime,
            prefs.sessionDuration,
            prefs.breakInterval
        );

        // Knowledge multipliers for sorting by need
        const knowledgeMultipliers = {
            beginner: 1.5,
            intermediate: 1.0,
            advanced: 0.75,
            expert: 0.5
        };

        // Sort subjects by need: weight × inverse knowledge (highest need first)
        const sortedSubjects = [...plan.subjects].sort((a, b) => {
            const needA = getSubjectWeight(a.name) * (knowledgeMultipliers[a.knowledgeLevel] || 1.0);
            const needB = getSubjectWeight(b.name) * (knowledgeMultipliers[b.knowledgeLevel] || 1.0);
            return needB - needA;
        });

        // IMPORTANT:
        // Only schedule as many subjects as available slots for this day.
        // Rotate subjects across days so all subjects get covered through the week.
        const sessionsPerDay = Math.min(timeSlots.length, sortedSubjects.length);
        const startOffset = (dayIndex * sessionsPerDay) % sortedSubjects.length;

        for (let i = 0; i < sessionsPerDay; i++) {
            const subject = sortedSubjects[(startOffset + i) % sortedSubjects.length];
            const slot = timeSlots[i];
            const topics = subject.topics.slice(0, 2);

            sessions.push({
                subject: subject.name,
                startTime: slot.start,
                endTime: slot.end,
                topics: topics.length > 0 ? topics.join(' - ') : 'General Study'
            });
        }

        return sessions;
    };

    const formatTo12Hour = (hour24, minute = 0) => {
        const modifier = hour24 >= 12 ? 'PM' : 'AM';
        const hour12 = hour24 % 12 || 12;
        return `${hour12}:${minute.toString().padStart(2, '0')} ${modifier}`;
    };

    // Get time slots based on preferred time + duration + break interval
    const getTimeSlots = (preferredTime, duration = 60, breakInterval = 15) => {
        const windows = {
            morning: { startHour: 9, endHour: 12 },
            afternoon: { startHour: 14, endHour: 17 },
            evening: { startHour: 18, endHour: 21 }
        };

        const { startHour, endHour } = windows[preferredTime] || windows.morning;
        const slots = [];

        let currentMinutes = startHour * 60;
        const endMinutes = endHour * 60;

        while (currentMinutes + duration <= endMinutes) {
            const startHour24 = Math.floor(currentMinutes / 60);
            const startMin = currentMinutes % 60;
            const endTotal = currentMinutes + duration;
            const endHour24 = Math.floor(endTotal / 60);
            const endMin = endTotal % 60;

            slots.push({
                start: formatTo12Hour(startHour24, startMin),
                end: formatTo12Hour(endHour24, endMin)
            });

            currentMinutes = endTotal + breakInterval;
        }

        return slots.length ? slots : [{ start: '9:00 AM', end: '10:00 AM' }];
    };

    // Calculate total hours per subject using weight AND knowledge level
    const getSubjectHours = () => {
        if (!studyPlan?.subjects) return [];

        // Knowledge inverse multiplier: lower knowledge = more study time
        const knowledgeMultipliers = {
            beginner: 1.5,      // needs 50% more time
            intermediate: 1.0,  // baseline
            advanced: 0.75,     // needs 25% less time
            expert: 0.5         // needs 50% less time
        };

        return studyPlan.subjects.map(subject => {
            const weight = getSubjectWeight(subject.name);
            const baseHours = 4;
            const topicBonus = subject.topics.length * 0.5;
            const weightMultiplier = 0.8 + (weight / 10) * 0.7;
            const knowledgeFactor = knowledgeMultipliers[subject.knowledgeLevel] || 1.0;
            const hours = Math.ceil((baseHours + topicBonus) * weightMultiplier * knowledgeFactor);

            return {
                name: subject.name,
                hours,
                weight,
                knowledgeLevel: subject.knowledgeLevel || 'intermediate',
                ...getSubjectStyle(subject.name)
            };
        });
    };

    // Calculate total weekly hours
    const getTotalHours = () => {
        const subjectHours = getSubjectHours();
        return subjectHours.reduce((total, s) => s.hours, 0);
    };

    // Load plan history with caching for faster display
    const loadPlanHistory = async () => {
        if (!auth.currentUser) return;

        // Show cached history immediately if available
        const cachedHistory = localStorage.getItem('planHistory');
        if (cachedHistory) {
            try {
                const parsed = JSON.parse(cachedHistory);
                setPlanHistory(parsed);
                // If we have cached data, don't show loading state
                setLoadingHistory(false);
            } catch (e) {
                console.error('Error parsing cached history:', e);
                setLoadingHistory(true);
            }
        } else {
            // Only show loading if no cache available
            setLoadingHistory(true);
        }

        // Background refresh from Firestore
        try {
            const result = await getPlanHistory(auth.currentUser.uid);
            if (result.success) {
                const history = result.data || [];
                setPlanHistory(history);
                // Cache for faster loading next time
                localStorage.setItem('planHistory', JSON.stringify(history));
            }
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Restore a plan from history
    const handleRestorePlan = async (plan) => {
        if (!auth.currentUser) return;

        // Strip archive fields to make a clean plan
        const { archivedAt, archiveId, id, ...cleanPlan } = plan;

        // Optimistic UI update — instant
        setStudyPlan(cleanPlan);
        generateWeekSchedule(cleanPlan);
        localStorage.setItem('studyPlan', JSON.stringify(cleanPlan));
        setShowHistoryModal(false);

        // Push to Firestore in background
        restorePlan(auth.currentUser.uid, plan)
            .then(() => {
                localStorage.removeItem('planHistory');
                loadPlanHistory();
            })
            .catch(error => {
                console.error('Error restoring plan to Firestore:', error);
            });
    };

    // Delete a plan from history
    const handleDeletePlan = async (plan) => {
        if (!auth.currentUser) return;
        if (!window.confirm('Are you sure you want to delete this plan from history?')) return;

        const planArchiveId = plan.archiveId || plan.id;

        // Optimistic UI update — remove immediately
        const updatedHistory = planHistory.filter(p => (p.archiveId || p.id) !== planArchiveId);
        setPlanHistory(updatedHistory);
        localStorage.setItem('planHistory', JSON.stringify(updatedHistory));

        // Delete from Firestore in background
        try {
            if (planArchiveId) {
                await deletePlanFromHistory(auth.currentUser.uid, planArchiveId);
            }
        } catch (error) {
            console.error('Error deleting plan:', error);
            // If Firestore delete failed, refresh from server to stay in sync
            loadPlanHistory();
        }
    };

    // Handle Regenerate button click - archives current plan, resets progress, and clears exam dates
    const handleRegenerate = () => {
        // Archive current plan to localStorage history IMMEDIATELY (synchronous)
        const currentPlanJSON = localStorage.getItem('studyPlan');
        if (currentPlanJSON) {
            try {
                const currentPlan = JSON.parse(currentPlanJSON);
                const historyJSON = localStorage.getItem('planHistory');
                const history = historyJSON ? JSON.parse(historyJSON) : [];
                history.unshift({
                    ...currentPlan,
                    id: Date.now().toString(),
                    archivedAt: new Date().toISOString()
                });
                localStorage.setItem('planHistory', JSON.stringify(history));
            } catch (e) {
                console.error('Error archiving plan to local history:', e);
            }
        }

        // Clear existing plan from localStorage
        localStorage.removeItem('studyPlan');
        localStorage.removeItem('completedTasks');
        localStorage.removeItem('customSessionTimes');

        // Navigate immediately - don't wait for Firestore
        navigate('/scheduling');

        // Run Firestore cleanup in background (non-blocking)
        if (auth.currentUser) {
            (async () => {
                try {
                    // Archive current plan to Firestore history
                    await archiveCurrentPlan(auth.currentUser.uid);

                    // Delete the study plan from Firestore (clears exam dates)
                    // Note: We do NOT reset progress/achievements - user keeps their earned XP and achievements
                    await deleteStudyPlan(auth.currentUser.uid);
                } catch (error) {
                    console.error('Error during regeneration cleanup:', error);
                }
            })();
        }
    };

    // Export PDF functionality
    const handleExportPDF = async () => {
        setIsExporting(true);

        try {
            // Dynamically import jsPDF
            const { jsPDF } = await import('jspdf');

            const doc = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Colors
            const primaryPurple = [124, 58, 237];
            const darkGray = [31, 41, 55];
            const mediumGray = [107, 114, 128];
            const lightGray = [243, 244, 246];

            // Header
            doc.setFillColor(...primaryPurple);
            doc.rect(0, 0, pageWidth, 25, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Weekly Study Plan', 15, 16);

            // Date range
            const today = new Date();
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay() + 1);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
            doc.text(dateRange, pageWidth - 15, 12, { align: 'right' });
            doc.text(`Total: ${getTotalHours()} hours planned`, pageWidth - 15, 18, { align: 'right' });

            // Subject Summary
            let yPos = 35;
            doc.setTextColor(...darkGray);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Subjects Overview', 15, yPos);

            yPos += 8;
            const subjectHours = getSubjectHours();
            const subjectColWidth = (pageWidth - 30) / Math.min(subjectHours.length, 4);

            subjectHours.forEach((subject, index) => {
                const xPos = 15 + (index % 4) * subjectColWidth;
                const currentY = yPos + Math.floor(index / 4) * 15;

                doc.setFillColor(219, 234, 254);
                doc.roundedRect(xPos, currentY, subjectColWidth - 5, 12, 2, 2, 'F');

                doc.setTextColor(...darkGray);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(`${subject.name}`, xPos + 3, currentY + 5);
                doc.setFont('helvetica', 'normal');
                doc.text(`${subject.hours} hours`, xPos + 3, currentY + 9);
            });

            // Weekly Schedule
            yPos = 65 + Math.ceil(subjectHours.length / 4) * 15;
            doc.setTextColor(...darkGray);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Weekly Schedule', 15, yPos);

            yPos += 8;
            const dayColWidth = (pageWidth - 30) / 7;
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            // Day headers
            days.forEach((day, index) => {
                const xPos = 15 + index * dayColWidth;
                const currentDate = new Date(weekStart);
                currentDate.setDate(weekStart.getDate() + index);

                doc.setFillColor(...lightGray);
                doc.roundedRect(xPos, yPos, dayColWidth - 2, 15, 2, 2, 'F');

                doc.setTextColor(...darkGray);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(day, xPos + dayColWidth / 2, yPos + 6, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...mediumGray);
                doc.setFontSize(7);
                doc.text(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), xPos + dayColWidth / 2, yPos + 11, { align: 'center' });
            });

            // Sessions for each day
            yPos += 18;
            const sessionHeight = 22;

            weekDays.forEach((day, dayIndex) => {
                const xPos = 15 + dayIndex * dayColWidth;

                if (day.isRestDay) {
                    doc.setFillColor(243, 232, 255);
                    doc.roundedRect(xPos, yPos, dayColWidth - 2, sessionHeight, 2, 2, 'F');
                    doc.setTextColor(124, 58, 237);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Rest Day', xPos + dayColWidth / 2, yPos + 10, { align: 'center' });
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6);
                    doc.text('Relaxation', xPos + dayColWidth / 2, yPos + 15, { align: 'center' });
                } else {
                    day.sessions.forEach((session, sessionIndex) => {
                        const sessionY = yPos + sessionIndex * (sessionHeight + 3);

                        if (sessionY + sessionHeight < pageHeight - 10) {
                            doc.setFillColor(219, 234, 254);
                            doc.roundedRect(xPos, sessionY, dayColWidth - 2, sessionHeight, 2, 2, 'F');

                            doc.setTextColor(37, 99, 235);
                            doc.setFontSize(7);
                            doc.setFont('helvetica', 'bold');
                            doc.text(session.subject, xPos + 2, sessionY + 5, { maxWidth: dayColWidth - 6 });

                            doc.setTextColor(...mediumGray);
                            doc.setFontSize(6);
                            doc.setFont('helvetica', 'normal');
                            doc.text(`${session.startTime} - ${session.endTime}`, xPos + 2, sessionY + 10);

                            doc.setTextColor(...darkGray);
                            doc.setFontSize(5);
                            const topicText = session.topics.length > 20 ? session.topics.substring(0, 17) + '...' : session.topics;
                            doc.text(topicText, xPos + 2, sessionY + 15, { maxWidth: dayColWidth - 6 });
                        }
                    });
                }
            });

            // Footer
            doc.setTextColor(...mediumGray);
            doc.setFontSize(8);
            doc.text('Generated by Scheduler - Your AI-Powered Study Companion', pageWidth / 2, pageHeight - 8, { align: 'center' });
            doc.text(new Date().toLocaleDateString('en-US', { dateStyle: 'full' }), pageWidth / 2, pageHeight - 4, { align: 'center' });

            // Save the PDF
            doc.save(`study-plan-${weekStart.toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleSessionClick = (session) => {
        const confirmHelp = window.confirm(`Would you like to ask the AI Assistant for help with ${session.subject}?`);
        if (confirmHelp) {
            navigate('/ai-assistant', { state: { subject: session.subject, topics: session.topics } });
        }
    };

    // Open time-edit modal for a session card
    const handleSessionCardClick = (dayIndex, sessionIndex, session) => {
        const key = `${dayIndex}-${sessionIndex}`;
        const override = customTimes[key];
        setEditingSession({
            dayIndex,
            sessionIndex,
            subject: session.subject,
            startTime: override?.startTime || session.startTime,
            endTime: override?.endTime || session.endTime
        });
    };

    // Save custom time for a session
    const handleSaveTime = () => {
        if (!editingSession) return;
        const key = `${editingSession.dayIndex}-${editingSession.sessionIndex}`;
        const updated = {
            ...customTimes,
            [key]: { startTime: editingSession.startTime, endTime: editingSession.endTime }
        };
        setCustomTimes(updated);
        localStorage.setItem('customSessionTimes', JSON.stringify(updated));

        // Update weekDays state immediately so the card reflects the change
        setWeekDays(prev => prev.map((day, di) => {
            if (di !== editingSession.dayIndex) return day;
            return {
                ...day,
                sessions: day.sessions.map((s, si) => {
                    if (si !== editingSession.sessionIndex) return s;
                    return { ...s, startTime: editingSession.startTime, endTime: editingSession.endTime };
                })
            };
        }));

        // Persist to Firestore in background
        if (auth.currentUser && studyPlan) {
            const updatedPlan = { ...studyPlan, customSessionTimes: updated };
            saveStudyPlan(auth.currentUser.uid, updatedPlan).catch(e => console.error('Error saving custom times:', e));
        }

        setEditingSession(null);
    };

    // Helper to convert 12h to 24h for time input
    const to24h = (time12) => {
        if (!time12) return '09:00';
        const [time, modifier] = time12.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    // Helper to convert 24h to 12h for display
    const to12h = (time24) => {
        if (!time24) return '9:00 AM';
        let [hours, minutes] = time24.split(':').map(Number);
        const modifier = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes.toString().padStart(2, '0')} ${modifier}`;
    };



    if (!studyPlan) {
        return (
            <div className="study-plan-container">
                <Sidebar activeNav="study-plan" />
                <main className="study-plan-main">
                    <div className="loading">{t('common_loading')}</div>
                </main>
            </div>
        );
    }

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return (
        <div className="study-plan-container">
            {/* Sidebar */}
            <Sidebar activeNav="study-plan" />

            {/* Main Content */}
            <main className="study-plan-main" ref={contentRef}>
                {/* Header */}
                <header className="study-plan-header">
                    <div className="header-left">
                        <img src={schedulerLogo} alt="Scheduler" className="header-logo" />
                        <div className="header-title">
                            <h1>{t('app_name')}</h1>
                            <p>Your personalized learning schedule</p>
                        </div>
                    </div>
                    <button
                        className={`export-btn ${isExporting ? 'exporting' : ''}`}
                        onClick={handleExportPDF}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <>
                                <svg className="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                                </svg>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Export PDF
                            </>
                        )}
                    </button>
                </header>

                {/* Plan Summary */}
                <div className="plan-summary">
                    <div className="summary-header">
                        <div>
                            <h2>{t('dashboard_weekly_progress')}</h2>
                            <p>
                                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-
                                {weekEnd.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })} •
                                Total: {getTotalHours()} hours planned
                            </p>
                        </div>
                        <div className="summary-actions">
                            <button className="history-btn" onClick={() => { setShowHistoryModal(true); loadPlanHistory(); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12,6 12,12 16,14" />
                                </svg>
                                Plan History
                            </button>
                            <button className="regenerate-btn" onClick={handleRegenerate}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 4v6h-6" />
                                    <path d="M1 20v-6h6" />
                                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                                </svg>
                                Regenerate
                            </button>
                            <button className="sticky-notes-btn" onClick={() => { setShowStickyNotes(true); setStickySelectedSubject(null); setStickyNoteText(''); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15.5 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8.5L15.5 3z" />
                                    <polyline points="14,3 14,9 21,9" />
                                    <line x1="9" y1="13" x2="15" y2="13" />
                                    <line x1="9" y1="17" x2="15" y2="17" />
                                </svg>
                                Sticky Notes
                            </button>
                        </div>
                    </div>

                    {/* Subject Hours */}
                    <div className="subject-hours">
                        {getSubjectHours().map((subject, index) => (
                            <div
                                key={index}
                                className="subject-hour-card"
                                style={{ backgroundColor: subject.bg }}
                            >
                                <span className="subject-icon" style={{ color: subject.color }}>
                                    {subject.icon}
                                </span>
                                <div className="subject-hour-info">
                                    <span className="subject-name" style={{ color: subject.color }}>
                                        {subject.name}
                                    </span>
                                    <span className="subject-hours-text" style={{ color: subject.color }}>
                                        {subject.hours} hours
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Weekly Calendar */}
                <div className="weekly-calendar">
                    {weekDays.map((day, dayIndex) => (
                        <div key={dayIndex} className="day-column">
                            <div className="day-header">
                                <span className="day-name">{day.name}</span>
                                <span className="day-date">{day.date}</span>
                            </div>
                            <div className="day-sessions">
                                {day.isRestDay ? (
                                    <div className="rest-day-card">
                                        <span className="rest-icon">💜</span>
                                        <span className="rest-title">Rest Day</span>
                                        <span className="rest-desc">Time for relaxation and review</span>
                                    </div>
                                ) : (
                                    day.sessions.map((session, sessionIndex) => {
                                        const style = getSubjectStyle(session.subject);
                                        return (
                                            <div
                                                key={sessionIndex}
                                                className={`session-card ${customTimes[`${dayIndex}-${sessionIndex}`] ? 'session-edited' : ''}`}
                                                style={{ backgroundColor: style.bg, cursor: 'pointer' }}
                                                onClick={() => handleSessionCardClick(dayIndex, sessionIndex, session)}
                                            >
                                                <div className="session-header">
                                                    <span
                                                        className="session-subject"
                                                        style={{ color: style.color }}
                                                    >
                                                        {style.icon} {session.subject}
                                                    </span>
                                                    <div className="session-header-icons">
                                                        {customTimes[`${dayIndex}-${sessionIndex}`] && (
                                                            <span className="edited-badge" title="Custom time">✏️</span>
                                                        )}
                                                        <span
                                                            className="session-link"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSessionClick(session);
                                                            }}
                                                            title="Get AI Help"
                                                        >🔗</span>
                                                    </div>
                                                </div>
                                                <div className="session-time">
                                                    {session.startTime} - {session.endTime}
                                                </div>
                                                <div className="session-topics">
                                                    {session.topics}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* History Modal */}
            {showHistoryModal && (
                <div className="history-modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="history-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="history-modal-header">
                            <h2>📚 {t('study_plan_history')}</h2>
                            <button className="close-btn" onClick={() => setShowHistoryModal(false)}>×</button>
                        </div>
                        <div className="history-modal-content">
                            {loadingHistory ? (
                                <div className="loading-history">
                                    <div className="spinner"></div>
                                    <p>{t('common_loading')}</p>
                                </div>
                            ) : planHistory.length === 0 ? (
                                <div className="empty-history">
                                    <div className="empty-icon">📭</div>
                                    <h3>No Previous Plans</h3>
                                    <p>Your previous study plans will appear here after you create a new plan.</p>
                                </div>
                            ) : (
                                <div className="history-list">
                                    {planHistory.map((plan) => (
                                        <div key={plan.id} className="history-item">
                                            <div className="history-item-info">
                                                <h3>{plan.subjects?.length || 0} Subjects</h3>
                                                <p className="subjects-list">
                                                    {plan.subjects?.map(s => s.name).join(', ') || 'No subjects'}
                                                </p>
                                                <span className="history-date">
                                                    Archived: {plan.archivedAt
                                                        ? new Date(typeof plan.archivedAt === 'string' ? plan.archivedAt : plan.archivedAt?.toDate ? plan.archivedAt.toDate() : plan.archivedAt).toLocaleDateString()
                                                        : plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'Unknown'}
                                                </span>
                                            </div>
                                            <div className="history-item-actions">
                                                <button
                                                    className="restore-btn"
                                                    onClick={() => handleRestorePlan(plan)}
                                                >
                                                    Restore
                                                </button>
                                                <button
                                                    className="delete-history-btn"
                                                    onClick={() => handleDeletePlan(plan)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Time Edit Modal */}
            {editingSession && (
                <div className="history-modal-overlay" onClick={() => setEditingSession(null)}>
                    <div className="time-edit-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="history-modal-header">
                            <h2>⏰ Adjust Time — {editingSession.subject}</h2>
                            <button className="close-btn" onClick={() => setEditingSession(null)}>×</button>
                        </div>
                        <div className="time-edit-content">
                            <p className="time-edit-day">
                                {weekDays[editingSession.dayIndex]?.name}, {weekDays[editingSession.dayIndex]?.date}
                            </p>
                            <div className="time-input-group">
                                <div className="time-field">
                                    <label>Start Time</label>
                                    <input
                                        type="time"
                                        value={to24h(editingSession.startTime)}
                                        onChange={(e) => setEditingSession(prev => ({
                                            ...prev,
                                            startTime: to12h(e.target.value)
                                        }))}
                                    />
                                </div>
                                <div className="time-field">
                                    <label>End Time</label>
                                    <input
                                        type="time"
                                        value={to24h(editingSession.endTime)}
                                        onChange={(e) => setEditingSession(prev => ({
                                            ...prev,
                                            endTime: to12h(e.target.value)
                                        }))}
                                    />
                                </div>
                            </div>
                            <div className="time-edit-actions">
                                <button className="time-cancel-btn" onClick={() => setEditingSession(null)}>Cancel</button>
                                <button className="time-save-btn" onClick={handleSaveTime}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sticky Notes Modal */}
            {showStickyNotes && studyPlan && (
                <div className="history-modal-overlay" onClick={() => setShowStickyNotes(false)}>
                    <div className="sticky-notes-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="history-modal-header">
                            <h2>📝 Sticky Notes</h2>
                            <button className="close-btn" onClick={() => setShowStickyNotes(false)}>×</button>
                        </div>
                        <div className="sticky-notes-content">
                            {/* Subject Chips */}
                            <div className="sticky-subject-chips">
                                {studyPlan.subjects && studyPlan.subjects.map((subject, idx) => {
                                    const noteKey = getStickyNoteKey(subject);
                                    const hasNote = !!stickyNotes[noteKey];
                                    return (
                                        <button
                                            key={idx}
                                            className={`sticky-chip ${stickySelectedSubject === idx ? 'active' : ''} ${hasNote ? 'has-note' : ''}`}
                                            onClick={() => {
                                                setStickySelectedSubject(idx);
                                                const key = getStickyNoteKey(subject);
                                                setStickyNoteText(stickyNotes[key] || '');
                                            }}
                                        >
                                            {subject.name}
                                            {hasNote && <span className="sticky-chip-dot">•</span>}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Note Editor */}
                            {stickySelectedSubject !== null && (() => {
                                const subject = studyPlan.subjects[stickySelectedSubject];
                                const noteKey = getStickyNoteKey(subject);
                                return (
                                    <div className="sticky-note-editor">
                                        <div className="sticky-editor-header">
                                            <h3>{subject.name}</h3>
                                            <span className="sticky-char-count">{stickyNoteText.length}/500</span>
                                        </div>
                                        {subject.topics && subject.topics.length > 0 && (
                                            <p className="sticky-topics">Topics: {subject.topics.join(', ')}</p>
                                        )}
                                        <textarea
                                            className="sticky-textarea"
                                            placeholder="Write your short notes here..."
                                            value={stickyNoteText}
                                            onChange={(e) => {
                                                if (e.target.value.length <= 500) setStickyNoteText(e.target.value);
                                            }}
                                            rows={5}
                                        />
                                        <div className="sticky-editor-actions">
                                            {stickyNotes[noteKey] && (
                                                <button
                                                    className="sticky-delete-btn"
                                                    onClick={() => {
                                                        const updated = { ...stickyNotes };
                                                        delete updated[noteKey];
                                                        setStickyNotes(updated);
                                                        localStorage.setItem('stickyNotes', JSON.stringify(updated));
                                                        setStickyNoteText('');
                                                    }}
                                                >
                                                    🗑️ Delete Note
                                                </button>
                                            )}
                                            <button
                                                className="sticky-save-btn"
                                                disabled={!stickyNoteText.trim()}
                                                onClick={() => {
                                                    const updated = { ...stickyNotes, [noteKey]: stickyNoteText.trim() };
                                                    setStickyNotes(updated);
                                                    localStorage.setItem('stickyNotes', JSON.stringify(updated));
                                                }}
                                            >
                                                💾 Save Note
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}

                            {stickySelectedSubject === null && (
                                <div className="sticky-empty-state">
                                    <span className="sticky-empty-icon">📝</span>
                                    <p>Select a subject above to view or add notes</p>
                                </div>
                            )}

                            {/* Saved Notes Summary */}
                            {(() => {
                                const currentKeys = (studyPlan.subjects || []).map(s => getStickyNoteKey(s));
                                const relevantNotes = Object.entries(stickyNotes).filter(([key]) => currentKeys.includes(key));
                                if (relevantNotes.length === 0) return null;
                                return (
                                    <div className="sticky-saved-section">
                                        <h4>📋 Your Notes ({relevantNotes.length})</h4>
                                        <div className="sticky-saved-list">
                                            {relevantNotes.map(([key, text]) => {
                                                const [subjectName] = key.split('|');
                                                return (
                                                    <div key={key} className="sticky-saved-card">
                                                        <div className="sticky-saved-header">
                                                            <span className="sticky-saved-subject">{subjectName}</span>
                                                            <button
                                                                className="sticky-saved-delete"
                                                                onClick={() => {
                                                                    const updated = { ...stickyNotes };
                                                                    delete updated[key];
                                                                    setStickyNotes(updated);
                                                                    localStorage.setItem('stickyNotes', JSON.stringify(updated));
                                                                    if (studyPlan.subjects[stickySelectedSubject] &&
                                                                        getStickyNoteKey(studyPlan.subjects[stickySelectedSubject]) === key) {
                                                                        setStickyNoteText('');
                                                                    }
                                                                }}
                                                                title="Delete note"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                        <p className="sticky-saved-text">{text}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyPlan;

