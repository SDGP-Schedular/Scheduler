import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import { auth } from '../../config/firebase';
import { getStudyPlan, getPlanHistory, restorePlan, archiveCurrentPlan, unlockAchievement, addXpPoints, resetProgress, deleteStudyPlan } from '../../services/firestoreService';
import { getSubjectWeight, calculateStudyTime } from '../../data/subjectsData';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './StudyPlan.css';

const StudyPlan = () => {
    const navigate = useNavigate();
    const [studyPlan, setStudyPlan] = useState(null);
    const [weekDays, setWeekDays] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [planHistory, setPlanHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const contentRef = useRef(null);

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
        const timeSlots = getTimeSlots(prefs.preferredTime, prefs.sessionDuration);

        // Distribute subjects across time slots
        plan.subjects.forEach((subject, subjectIndex) => {
            if (timeSlots[subjectIndex % timeSlots.length]) {
                const slot = timeSlots[subjectIndex % timeSlots.length];
                const topics = subject.topics.slice(0, 2);

                sessions.push({
                    subject: subject.name,
                    startTime: slot.start,
                    endTime: slot.end,
                    topics: topics.length > 0 ? topics.join(' - ') : 'General Study'
                });
            }
        });

        return sessions;
    };

    // Get time slots based on preferred time
    const getTimeSlots = (preferredTime, duration) => {
        const slots = {
            morning: [
                { start: '9:00 AM', end: '11:00 AM' },
                { start: '11:00 AM', end: '12:00 PM' }
            ],
            afternoon: [
                { start: '2:00 PM', end: '4:00 PM' },
                { start: '4:00 PM', end: '5:00 PM' }
            ],
            evening: [
                { start: '6:00 PM', end: '8:00 PM' },
                { start: '8:00 PM', end: '9:00 PM' }
            ]
        };
        return slots[preferredTime] || slots.morning;
    };

    // Calculate total hours per subject using weight-based calculation
    const getSubjectHours = () => {
        if (!studyPlan?.subjects) return [];

        return studyPlan.subjects.map(subject => {
            // Get subject weight (1-10 scale, higher = more difficult)
            const weight = getSubjectWeight(subject.name);
            // Calculate study time using weight formula: baseTime × (0.8 + weight/10 × 0.7)
            const baseHours = 4; // Base hours per subject
            const topicBonus = subject.topics.length * 0.5; // Additional hours for topics
            const weightMultiplier = 0.8 + (weight / 10) * 0.7;
            const hours = Math.ceil((baseHours + topicBonus) * weightMultiplier);

            return {
                name: subject.name,
                hours,
                weight,
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

        try {
            const result = await restorePlan(auth.currentUser.uid, plan);
            if (result.success) {
                setStudyPlan(plan);
                generateWeekSchedule(plan);
                setShowHistoryModal(false);
            }
        } catch (error) {
            console.error('Error restoring plan:', error);
        }
    };

    // Handle Regenerate button click - archives current plan, resets progress, and clears exam dates
    const handleRegenerate = () => {
        // Clear existing plan from localStorage FIRST
        localStorage.removeItem('studyPlan');
        localStorage.removeItem('planHistory');

        // Navigate immediately - don't wait for Firestore
        navigate('/scheduling');

        // Run Firestore cleanup in background (non-blocking)
        if (auth.currentUser) {
            (async () => {
                try {
                    // Archive current plan to history before regenerating
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

    const handleNavigation = (nav) => {
        setActiveNav(nav);
        switch (nav) {
            case 'home':
                navigate('/dashboard');
                break;
            case 'schedule':
                navigate('/study-plan');
                break;
            case 'calendar':
                navigate('/calendar');
                break;
            case 'stats':
                navigate('/analytics');
                break;
            case 'ai':
                navigate('/ai-assistant');
                break;
            case 'gamification':
                navigate('/gamification');
                break;
            case 'settings':
                // Future settings page
                break;
            default:
                break;
        }
    };

    if (!studyPlan) {
        return <div className="loading">Loading your study plan...</div>;
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
                            <h1>Scheduler</h1>
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
                            <h2>Weekly Study Plan</h2>
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
                                                className="session-card"
                                                style={{ backgroundColor: style.bg }}
                                            >
                                                <div className="session-header">
                                                    <span
                                                        className="session-subject"
                                                        style={{ color: style.color }}
                                                    >
                                                        {style.icon} {session.subject}
                                                    </span>
                                                    <span
                                                        className="session-link"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSessionClick(session);
                                                        }}
                                                        title="Get AI Help"
                                                    >🔗</span>
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
                            <h2>📚 Study Plan History</h2>
                            <button className="close-btn" onClick={() => setShowHistoryModal(false)}>×</button>
                        </div>
                        <div className="history-modal-content">
                            {loadingHistory ? (
                                <div className="loading-history">
                                    <div className="spinner"></div>
                                    <p>Loading history...</p>
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
                                                    Archived: {plan.archivedAt?.toDate ?
                                                        new Date(plan.archivedAt.toDate()).toLocaleDateString() :
                                                        plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'Unknown'}
                                                </span>
                                            </div>
                                            <button
                                                className="restore-btn"
                                                onClick={() => handleRestorePlan(plan)}
                                            >
                                                Restore
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyPlan;

