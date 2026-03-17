import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import { auth } from '../../config/firebase';
import { getStudyPlan, getProgress } from '../../services/firestoreService';
import { useLanguage } from '../../i18n/LanguageContext';
import './Analytics.css';

const Analytics = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [viewType, setViewType] = useState('weekly'); // 'weekly' or 'monthly'
    const [studyPlan, setStudyPlan] = useState(null);
    const [progress, setProgress] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const contentRef = useRef(null);

    // Calculate date range based on view type
    useEffect(() => {
        const end = new Date();
        const start = new Date();
        if (viewType === 'weekly') {
            start.setDate(end.getDate() - 7);
        } else {
            start.setDate(end.getDate() - 30);
        }
        setDateRange({
            start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
    }, [viewType]);

    // Load data from localStorage immediately (no loading state)
    useEffect(() => {
        const cachedPlan = localStorage.getItem('studyPlan');
        if (cachedPlan) {
            try {
                setStudyPlan(JSON.parse(cachedPlan));
            } catch (e) {
                console.error('Error parsing cached plan:', e);
            }
        }
        setIsLoading(false); // Immediately stop loading for localStorage data

        // Then sync from Firestore in background
        const syncFromFirestore = async () => {
            if (auth.currentUser) {
                try {
                    const planResult = await getStudyPlan(auth.currentUser.uid);
                    if (planResult.success && planResult.data) {
                        setStudyPlan(planResult.data);
                    }
                    const progressResult = await getProgress(auth.currentUser.uid);
                    if (progressResult.success && progressResult.data) {
                        setProgress(progressResult.data);
                    }
                } catch (error) {
                    console.error('Error syncing from Firestore:', error);
                }
            }
        };
        syncFromFirestore();
    }, []);

    // Generate analytics data from study plan
    const getAnalyticsData = () => {
        if (!studyPlan || !studyPlan.subjects) {
            return null;
        }

        const subjectCount = studyPlan.subjects.length;
        const sessionDuration = studyPlan.preferences?.sessionDuration || 45;
        const daysPerWeek = studyPlan.preferences?.daysPerWeek || 5;

        // Calculate totals based on view type
        const multiplier = viewType === 'weekly' ? 1 : 4;
        const totalHours = Math.round((subjectCount * sessionDuration * daysPerWeek * multiplier) / 60 * 10) / 10;

        // Mock progress data (will be replaced with actual tracking)
        const completionRate = progress?.completedSessions ?
            Math.min(100, Math.round((progress.completedSessions / (subjectCount * daysPerWeek * multiplier)) * 100)) : 0;

        const consistencyScore = progress?.studyStreak ?
            Math.min(100, progress.studyStreak * 10) : 0;

        const averageScore = subjectCount > 0 ?
            Math.round((completionRate + consistencyScore) / 2) : 0;

        return {
            totalHours,
            completionRate,
            consistencyScore,
            averageScore
        };
    };

    // Generate weekly data for charts
    const getWeeklyData = () => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const daysPerWeek = studyPlan?.preferences?.daysPerWeek || 5;
        const sessionDuration = studyPlan?.preferences?.sessionDuration || 45;
        const subjectCount = studyPlan?.subjects?.length || 0;

        const plannedHoursPerDay = (subjectCount * sessionDuration) / 60;

        return days.map((day, index) => ({
            day,
            planned: index < daysPerWeek && index < 6 ? Math.round(plannedHoursPerDay * 10) / 10 : 0,
            actual: 0, // Will be populated from progress tracking
            completion: 0
        }));
    };

    // Get subject performance data
    const getSubjectData = () => {
        if (!studyPlan || !studyPlan.subjects) return [];

        const colors = ['#7C3AED', '#3B82F6', '#10B981', '#F97316', '#EF4444', '#EC4899', '#8B5CF6'];

        return studyPlan.subjects.map((subject, index) => ({
            name: subject.name,
            progress: Math.floor(Math.random() * 30) + 70, // Placeholder - will be tracked
            color: colors[index % colors.length]
        }));
    };

    // Get badges/achievements data
    const getBadgesData = () => {
        const badges = [];
        const streak = progress?.studyStreak || 0;

        if (streak >= 7) badges.push({ icon: '🔥', title: '7-Day Streak', subtitle: 'Consistency', color: '#EDE9FE' });
        if (streak >= 3) badges.push({ icon: '📖', title: 'Chapter Master', subtitle: `${Math.floor(streak / 3)} Chapters`, color: '#DBEAFE' });

        const completedGoals = progress?.completedSessions || 0;
        if (completedGoals >= 15) badges.push({ icon: '🎯', title: 'Goal Crusher', subtitle: `${completedGoals} Goals`, color: '#D1FAE5' });
        if (completedGoals >= 10) badges.push({ icon: '⭐', title: 'Quiz Genius', subtitle: '85%+ Score', color: '#FEF3C7' });
        if (completedGoals >= 5) badges.push({ icon: '🚀', title: 'Fast Learner', subtitle: 'Speed Bonus', color: '#FCE7F3' });

        // Ensure at least some sample badges
        if (badges.length === 0) {
            badges.push({ icon: '📚', title: 'Getting Started', subtitle: 'First Steps', color: '#DBEAFE' });
        }

        return badges;
    };

    const handleViewDetails = () => {
        alert("Detailed subject breakdown is coming soon! Check the current metrics for now.");
    };

    // Export report
    const handleExport = async (format) => {
        if (!studyPlan) return;

        const analytics = getAnalyticsData();
        const subjects = getSubjectData();
        const badges = getBadgesData();
        const weeklyChartData = getWeeklyData();

        if (format === 'csv') {
            // Generate CSV
            let csv = 'Performance Analytics Report\n';
            csv += `Period,${viewType === 'weekly' ? 'Weekly' : 'Monthly'}\n`;
            csv += `Date Range,${dateRange.start} - ${dateRange.end}\n\n`;
            csv += `Total Study Hours,${analytics?.totalHours || 0}\n`;
            csv += `Completion Rate,${analytics?.completionRate || 0}%\n`;
            csv += `Consistency Score,${analytics?.consistencyScore || 0}\n`;
            csv += `Average Score,${analytics?.averageScore || 0}%\n\n`;
            csv += 'Subject Performance\n';
            csv += 'Subject,Progress\n';
            subjects.forEach(s => {
                csv += `${s.name},${s.progress}%\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-${viewType}-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'pdf') {
            // Generate PDF with jsPDF
            try {
                const { jsPDF } = await import('jspdf');
                const doc = new jsPDF('portrait', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();

                // Colors
                const primaryPurple = [124, 58, 237];
                const gradientStart = [124, 58, 237];
                const gradientEnd = [168, 85, 247];
                const white = [255, 255, 255];
                const darkGray = [31, 41, 55];
                const mediumGray = [107, 114, 128];
                const lightGray = [243, 244, 246];

                // Draw gradient header
                const headerHeight = 45;
                for (let i = 0; i < headerHeight; i++) {
                    const ratio = i / headerHeight;
                    const r = Math.round(gradientStart[0] + (gradientEnd[0] - gradientStart[0]) * ratio);
                    const g = Math.round(gradientStart[1] + (gradientEnd[1] - gradientStart[1]) * ratio);
                    const b = Math.round(gradientStart[2] + (gradientEnd[2] - gradientStart[2]) * ratio);
                    doc.setFillColor(r, g, b);
                    doc.rect(0, i, pageWidth, 1.5, 'F');
                }

                // Header text
                doc.setTextColor(...white);
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.text(`${viewType === 'weekly' ? 'Weekly' : 'Monthly'} Progress Report`, 20, 25);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.text(`${dateRange.start} - ${dateRange.end}, ${new Date().getFullYear()}`, 20, 35);

                // Stats Cards Section
                let yPos = 60;
                const cardWidth = 55;
                const cardHeight = 40;
                const cardGap = 10;
                const cardsStartX = 20;

                // Stats cards data
                const statsCards = [
                    {
                        icon: '⏱️',
                        label: 'Hours Studied',
                        value: `${analytics?.totalHours || 0}`,
                        subtext: '4.1 hrs/day average',
                        change: '+12%',
                        bgColor: [219, 234, 254],
                        iconBg: [59, 130, 246]
                    },
                    {
                        icon: '🎯',
                        label: 'Goals Achieved',
                        value: `${Math.min(progress?.completedSessions || 0, 18)}/18`,
                        subtext: '83% completion rate',
                        change: '+25%',
                        bgColor: [220, 252, 231],
                        iconBg: [34, 197, 94]
                    },
                    {
                        icon: '⭐',
                        label: 'Avg Quiz Score',
                        value: `${analytics?.averageScore || 87}%`,
                        subtext: '12 quizzes completed',
                        change: '+8%',
                        bgColor: [254, 249, 195],
                        iconBg: [234, 179, 8]
                    }
                ];

                // Draw stats cards
                statsCards.forEach((card, index) => {
                    const x = cardsStartX + (cardWidth + cardGap) * index;

                    // Card background
                    doc.setFillColor(...card.bgColor);
                    doc.roundedRect(x, yPos, cardWidth, cardHeight, 4, 4, 'F');

                    // Icon circle
                    doc.setFillColor(...card.iconBg);
                    doc.circle(x + 12, yPos + 12, 6, 'F');

                    // Change badge
                    doc.setFillColor(220, 252, 231);
                    doc.roundedRect(x + cardWidth - 20, yPos + 5, 16, 8, 2, 2, 'F');
                    doc.setTextColor(34, 197, 94);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`↑ ${card.change}`, x + cardWidth - 18, yPos + 10);

                    // Label
                    doc.setTextColor(...mediumGray);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.text(card.label, x + 8, yPos + 22);

                    // Value
                    doc.setTextColor(...darkGray);
                    doc.setFontSize(16);
                    doc.setFont('helvetica', 'bold');
                    doc.text(card.value, x + 8, yPos + 33);

                    // Subtext
                    doc.setTextColor(...mediumGray);
                    doc.setFontSize(6);
                    doc.setFont('helvetica', 'normal');
                    doc.text(card.subtext, x + 8, yPos + 38);
                });

                // Study Consistency Chart Section
                yPos += cardHeight + 20;

                // Section header
                doc.setTextColor(...darkGray);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('📊 Study Consistency', 20, yPos);

                // Chart area
                yPos += 10;
                const chartX = 25;
                const chartY = yPos;
                const chartWidth = 160;
                const chartHeight = 50;

                // Chart background
                doc.setFillColor(250, 250, 255);
                doc.roundedRect(20, chartY - 5, chartWidth + 10, chartHeight + 15, 4, 4, 'F');

                // Draw grid lines
                doc.setDrawColor(229, 231, 235);
                doc.setLineWidth(0.2);
                for (let i = 0; i <= 5; i++) {
                    const lineY = chartY + (chartHeight / 5) * i;
                    doc.line(chartX, lineY, chartX + chartWidth, lineY);
                }

                // Y-axis labels
                doc.setTextColor(...mediumGray);
                doc.setFontSize(7);
                for (let i = 0; i <= 5; i++) {
                    doc.text(`${5 - i}`, chartX - 6, chartY + (chartHeight / 5) * i + 3);
                }

                // Draw line chart
                const chartPoints = weeklyChartData.map((d, i) => ({
                    x: chartX + (chartWidth / 6) * i,
                    y: chartY + chartHeight - (d.planned / 5) * chartHeight
                }));

                // Draw shaded area under line
                doc.setFillColor(219, 234, 254);
                doc.setGState(new doc.GState({ opacity: 0.3 }));
                let areaPath = `M ${chartPoints[0].x} ${chartY + chartHeight}`;
                chartPoints.forEach(p => { areaPath += ` L ${p.x} ${p.y}`; });
                areaPath += ` L ${chartPoints[chartPoints.length - 1].x} ${chartY + chartHeight} Z`;
                // For simplicity, draw a polygon
                const areaPoints = [
                    [chartPoints[0].x, chartY + chartHeight],
                    ...chartPoints.map(p => [p.x, p.y]),
                    [chartPoints[chartPoints.length - 1].x, chartY + chartHeight]
                ];
                // Draw filled polygon
                doc.setFillColor(219, 234, 254);
                // Note: jsPDF doesn't have native polygon fill with opacity, so we'll skip shading
                doc.setGState(new doc.GState({ opacity: 1 }));

                // Draw the line
                doc.setDrawColor(59, 130, 246);
                doc.setLineWidth(0.8);
                for (let i = 0; i < chartPoints.length - 1; i++) {
                    doc.line(chartPoints[i].x, chartPoints[i].y, chartPoints[i + 1].x, chartPoints[i + 1].y);
                }

                // Draw dots on line
                doc.setFillColor(59, 130, 246);
                chartPoints.forEach(p => {
                    doc.circle(p.x, p.y, 1.5, 'F');
                });

                // X-axis labels
                doc.setTextColor(...mediumGray);
                doc.setFontSize(8);
                weeklyChartData.forEach((d, i) => {
                    doc.text(d.day, chartX + (chartWidth / 6) * i - 5, chartY + chartHeight + 8);
                });

                // Badges Section
                yPos = chartY + chartHeight + 25;

                // Section header
                doc.setTextColor(...darkGray);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`🏆 Badges Earned This ${viewType === 'weekly' ? 'Week' : 'Month'}`, 20, yPos);

                // Draw badges
                yPos += 10;
                const badgeWidth = 32;
                const badgeHeight = 45;
                const badgeGap = 5;

                badges.slice(0, 5).forEach((badge, index) => {
                    const x = 20 + (badgeWidth + badgeGap) * index;

                    // Badge card
                    const rgb = badge.color.startsWith('#') ?
                        [parseInt(badge.color.slice(1, 3), 16), parseInt(badge.color.slice(3, 5), 16), parseInt(badge.color.slice(5, 7), 16)] :
                        [237, 233, 254];
                    doc.setFillColor(...rgb);
                    doc.roundedRect(x, yPos, badgeWidth, badgeHeight, 4, 4, 'F');

                    // Icon circle
                    doc.setFillColor(255, 255, 255);
                    doc.circle(x + badgeWidth / 2, yPos + 15, 8, 'F');

                    // Note: jsPDF can't render emoji directly, so we'll use text placeholders
                    doc.setTextColor(...darkGray);
                    doc.setFontSize(12);
                    doc.text(badge.icon, x + badgeWidth / 2 - 3, yPos + 18);

                    // Badge title
                    doc.setTextColor(...darkGray);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    const titleLines = doc.splitTextToSize(badge.title, badgeWidth - 4);
                    doc.text(titleLines, x + badgeWidth / 2, yPos + 30, { align: 'center' });

                    // Subtitle
                    doc.setTextColor(...mediumGray);
                    doc.setFontSize(6);
                    doc.setFont('helvetica', 'normal');
                    doc.text(badge.subtitle, x + badgeWidth / 2, yPos + 40, { align: 'center' });
                });

                // Footer
                yPos = pageHeight - 20;
                doc.setDrawColor(229, 231, 235);
                doc.setLineWidth(0.3);
                doc.line(20, yPos - 5, pageWidth - 20, yPos - 5);

                doc.setTextColor(...mediumGray);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 20, yPos);

                // Status badge
                doc.setFillColor(220, 252, 231);
                doc.circle(pageWidth / 2 - 15, yPos - 2, 3, 'F');
                doc.setTextColor(34, 197, 94);
                doc.setFont('helvetica', 'bold');
                doc.text('On Track', pageWidth / 2 - 10, yPos);

                // Motivational text
                doc.setTextColor(59, 130, 246);
                doc.setFont('helvetica', 'normal');
                doc.text('Keep up the great work!', pageWidth - 20, yPos, { align: 'right' });

                // Save the PDF
                doc.save(`${viewType}-progress-report-${new Date().toISOString().split('T')[0]}.pdf`);
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Failed to generate PDF. Please try again.');
            }
        }
    };

    const analytics = getAnalyticsData();
    const weeklyData = getWeeklyData();
    const subjectData = getSubjectData();
    const hasPlan = studyPlan && studyPlan.subjects && studyPlan.subjects.length > 0;

    if (isLoading) {
        return (
            <div className="analytics-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>{t('common_loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            {/* Sidebar */}
            <Sidebar activeNav="analytics" />

            {/* Main Content */}
            <main className="analytics-main" ref={contentRef}>
                {/* Header */}
                <header className="analytics-header">
                    <div className="header-left">
                        <h1>{t('analytics_title')}</h1>
                        <p>{t('analytics_subtitle')}</p>
                    </div>
                    <div className="header-right">
                        {/* View Toggle */}
                        <div className="view-toggle">
                            <button
                                className={`toggle-btn ${viewType === 'weekly' ? 'active' : ''}`}
                                onClick={() => setViewType('weekly')}
                            >
                                Weekly
                            </button>
                            <button
                                className={`toggle-btn ${viewType === 'monthly' ? 'active' : ''}`}
                                onClick={() => setViewType('monthly')}
                            >
                                Monthly
                            </button>
                        </div>

                        {/* Date Range */}
                        <div className="date-range">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>{dateRange.start} - {dateRange.end}</span>
                        </div>

                        {/* Export Button */}
                        <button className="export-btn pdf" onClick={() => handleExport('pdf')} disabled={!hasPlan} title="Download PDF Report">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            {t('analytics_export')}
                        </button>
                    </div>
                </header>

                {!hasPlan ? (
                    /* Empty State */
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <h2>{t('analytics_title')}</h2>
                        <p>{t('analytics_subtitle')}</p>
                        <button className="create-plan-btn" onClick={() => navigate('/scheduling')}>
                            {t('study_plan_create')}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <section className="stats-cards">
                            <div className="stat-card blue">
                                <div className="stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12,6 12,12 16,14" />
                                    </svg>
                                </div>
                                <div className="stat-info">
                                    <span className="stat-label">{t('analytics_total_hours')}</span>
                                    <span className="stat-value">{analytics?.totalHours || 0}h</span>
                                    <span className="stat-period">{viewType === 'weekly' ? t('analytics_this_week') : t('analytics_this_month')}</span>
                                </div>
                                <span className="stat-badge green">+12%</span>
                            </div>

                            <div className="stat-card green">
                                <div className="stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 11l3 3L22 4" />
                                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                                    </svg>
                                </div>
                                <div className="stat-info">
                                    <span className="stat-label">{t('analytics_performance')}</span>
                                    <span className="stat-value">{analytics?.completionRate || 0}%</span>
                                    <span className="stat-period">Tasks completed</span>
                                </div>
                                <span className="stat-badge green">+3%</span>
                            </div>

                            <div className="stat-card orange">
                                <div className="stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                    </svg>
                                </div>
                                <div className="stat-info">
                                    <span className="stat-label">{t('analytics_subjects')}</span>
                                    <span className="stat-value">{analytics?.consistencyScore || 0}</span>
                                    <span className="stat-period">Out of 100</span>
                                </div>
                                <span className="stat-badge green">+5%</span>
                            </div>

                            <div className="stat-card purple">
                                <div className="stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="20" x2="18" y2="10" />
                                        <line x1="12" y1="20" x2="12" y2="4" />
                                        <line x1="6" y1="20" x2="6" y2="14" />
                                    </svg>
                                </div>
                                <div className="stat-info">
                                    <span className="stat-label">{t('dashboard_avg_score')}</span>
                                    <span className="stat-value">{analytics?.averageScore || 0}%</span>
                                    <span className="stat-period">Across subjects</span>
                                </div>
                                <span className="stat-badge green">+15%</span>
                            </div>
                        </section>

                        {/* Charts Row 1 */}
                        <section className="charts-row">
                            {/* Study Hours Trend */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Study Hours Trend</h3>
                                    <span className="chart-subtitle">Daily study time over the week</span>
                                </div>
                                <div className="chart-goal">
                                    Goal: {(studyPlan?.subjects?.length || 0) * (studyPlan?.preferences?.sessionDuration || 45) / 60}h/day
                                </div>
                                <div className="line-chart">
                                    <div className="chart-grid">
                                        {[6, 5, 4, 3, 2, 1, 0].map(h => (
                                            <div key={h} className="grid-line">
                                                <span className="grid-label">{h}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="chart-line">
                                        {weeklyData.map((day, index) => (
                                            <div key={day.day} className="chart-point-wrapper">
                                                <div
                                                    className="chart-point"
                                                    style={{ bottom: `${(day.planned / 6) * 100}%` }}
                                                ></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="chart-labels">
                                        {weeklyData.map(day => (
                                            <span key={day.day}>{day.day}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Completion Rate */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Completion Rate</h3>
                                    <span className="chart-subtitle">Task completion over time</span>
                                </div>
                                <div className="chart-legend">
                                    <span className="legend-item"><span className="dot completed"></span> Completed</span>
                                    <span className="legend-item"><span className="dot pending"></span> Pending</span>
                                </div>
                                <div className="area-chart">
                                    <div className="chart-grid">
                                        {[100, 90, 80, 70, 60].map(p => (
                                            <div key={p} className="grid-line">
                                                <span className="grid-label">{p}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="area-fill"></div>
                                    <div className="chart-labels">
                                        {weeklyData.map(day => (
                                            <span key={day.day}>{day.day}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Charts Row 2 */}
                        <section className="charts-row">
                            {/* Consistency Score */}
                            <div className="chart-card small">
                                <div className="chart-header">
                                    <h3>Consistency Score</h3>
                                    <span className="chart-subtitle">Weekly consistency metrics</span>
                                </div>
                                <div className="bar-chart">
                                    {weeklyData.map((day, index) => (
                                        <div key={day.day} className="bar-wrapper">
                                            <div
                                                className="bar"
                                                style={{
                                                    height: `${day.planned > 0 ? Math.random() * 50 + 50 : 0}%`,
                                                    background: day.planned > 0 ? 'linear-gradient(180deg, #7C3AED, #A78BFA)' : '#E5E7EB'
                                                }}
                                            ></div>
                                            <span className="bar-label">{day.day}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Subject-wise Performance */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Subject-wise Performance</h3>
                                    <span className="chart-subtitle">Average scores by subject</span>
                                    <button className="view-details-btn" onClick={handleViewDetails}>{t('dashboard_view_all')}</button>
                                </div>
                                <div className="subject-bars">
                                    {subjectData.slice(0, 5).map((subject, index) => (
                                        <div key={index} className="subject-bar-wrapper">
                                            <div
                                                className="subject-bar"
                                                style={{
                                                    height: `${subject.progress}%`,
                                                    background: subject.color
                                                }}
                                            ></div>
                                            <span className="subject-label">{subject.name.substring(0, 10)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Charts Row 3 */}
                        <section className="charts-row">
                            {/* Time Distribution */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Time Distribution</h3>
                                    <span className="chart-subtitle">Study time by subject</span>
                                </div>
                                <div className="pie-chart-container">
                                    <div className="pie-chart">
                                        {subjectData.map((subject, index) => {
                                            const rotation = (index / subjectData.length) * 360;
                                            const percentage = 100 / subjectData.length;
                                            return (
                                                <div
                                                    key={index}
                                                    className="pie-slice"
                                                    style={{
                                                        '--rotation': `${rotation}deg`,
                                                        '--percentage': percentage,
                                                        '--color': subject.color
                                                    }}
                                                ></div>
                                            );
                                        })}
                                        <div className="pie-center">
                                            <span className="pie-total">{studyPlan?.subjects?.length || 0}</span>
                                            <span className="pie-label">{t('analytics_subjects')}</span>
                                        </div>
                                    </div>
                                    <div className="pie-legend">
                                        {subjectData.map((subject, index) => (
                                            <div key={index} className="legend-row">
                                                <span className="legend-color" style={{ background: subject.color }}></span>
                                                <span className="legend-name">{subject.name}</span>
                                                <span className="legend-value">{Math.round(100 / subjectData.length)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Performance Breakdown */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Performance Breakdown</h3>
                                    <span className="chart-subtitle">Detailed subject analysis</span>
                                </div>
                                <div className="performance-list">
                                    {subjectData.map((subject, index) => (
                                        <div key={index} className="performance-item">
                                            <span className="perf-color" style={{ background: subject.color }}></span>
                                            <span className="perf-name">{subject.name}</span>
                                            <div className="perf-bar-container">
                                                <div
                                                    className="perf-bar"
                                                    style={{ width: `${subject.progress}%`, background: subject.color }}
                                                ></div>
                                            </div>
                                            <span className="perf-value">{subject.progress}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
};

export default Analytics;
