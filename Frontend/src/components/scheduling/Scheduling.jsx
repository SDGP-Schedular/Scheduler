import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { searchSubjects, getTopicsForSubject, getSubjectWeight, calculateStudyTime } from '../../data/subjectsData';
import { saveStudyPlan, addXpPoints, archiveCurrentPlan, getPlanHistory, restorePlan, unlockAchievement, deletePlanFromHistory } from '../../services/firestoreService';
import { useLanguage } from '../../i18n/LanguageContext';
import Sidebar from '../common/Sidebar';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './Scheduling.css';

const Scheduling = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [currentStep, setCurrentStep] = useState(1);
    const user = auth.currentUser;

    // Subjects with individual data - each subject has its own exam date, level, and topics
    const [subjects, setSubjects] = useState([]);
    // Currently editing subject index (-1 means adding new)
    const [currentSubjectIndex, setCurrentSubjectIndex] = useState(-1);
    // Current subject being edited
    const [currentSubject, setCurrentSubject] = useState({
        name: '',
        examDate: '',
        knowledgeLevel: 'intermediate',
        topics: []
    });

    // Preferences (shared across all subjects)
    const [preferences, setPreferences] = useState({
        sessionDuration: 45,
        preferredTime: 'morning',
        breakInterval: 45,
        daysPerWeek: 5
    });

    // Goals (shared across all subjects)
    const [goals, setGoals] = useState({
        targetGrade: 'A+',
        focusAreas: ['problem-solving', 'theory'],
        prioritySubject: ''
    });

    // Subject input state
    const [subjectInput, setSubjectInput] = useState('');
    const [subjectSuggestions, setSubjectSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // History modal state
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [planHistory, setPlanHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

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
            const result = await getPlanHistory(auth.currentUser.uid, 10);
            if (result.success) {
                const history = result.data || [];
                setPlanHistory(history);
                // Cache for faster loading next time
                localStorage.setItem('planHistory', JSON.stringify(history));
            }
        } catch (error) {
            console.error('Error loading plan history:', error);
        }
        setLoadingHistory(false);
    };

    // Preload plan history in background for faster modal display
    useEffect(() => {
        if (auth.currentUser) {
            loadPlanHistory();
        }
    }, []);

    // Handle restore plan
    const handleRestorePlan = async (plan) => {
        if (!auth.currentUser) return;

        // Strip archive fields
        const { archivedAt, archiveId, id, ...cleanPlan } = plan;

        // Optimistic: update localStorage and navigate immediately
        localStorage.setItem('studyPlan', JSON.stringify(cleanPlan));
        setShowHistoryModal(false);
        navigate('/study-plan');

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

        // Firestore delete in background
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

    // Topic input state
    const [topicInput, setTopicInput] = useState('');
    const [availableTopics, setAvailableTopics] = useState([]);

    // Update available topics when current subject changes
    useEffect(() => {
        if (currentSubject.name) {
            const topics = getTopicsForSubject(currentSubject.name);
            setAvailableTopics(topics);
        } else {
            setAvailableTopics([]);
        }
    }, [currentSubject.name]);

    // Handle subject search
    const handleSubjectInputChange = (e) => {
        const value = e.target.value;
        setSubjectInput(value);

        if (value.length > 0) {
            // Filter out already added subjects
            const existingNames = subjects.map(s => s.name);
            const suggestions = searchSubjects(value)
                .filter(s => !existingNames.includes(s))
                .slice(0, 8);
            setSubjectSuggestions(suggestions);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    // Select subject to configure
    const selectSubject = (subjectName) => {
        setCurrentSubject({
            name: subjectName,
            examDate: '',
            knowledgeLevel: 'intermediate',
            topics: []
        });
        setSubjectInput('');
        setShowSuggestions(false);
        setCurrentSubjectIndex(-1); // -1 means new subject
    };

    // Edit existing subject
    const editSubject = (index) => {
        setCurrentSubject({ ...subjects[index] });
        setCurrentSubjectIndex(index);
    };

    // Save current subject
    const saveCurrentSubject = () => {
        if (!currentSubject.name) return;

        if (currentSubjectIndex === -1) {
            // Adding new subject
            setSubjects(prev => [...prev, { ...currentSubject }]);
        } else {
            // Updating existing subject
            setSubjects(prev => prev.map((s, i) =>
                i === currentSubjectIndex ? { ...currentSubject } : s
            ));
        }

        // Reset current subject form
        setCurrentSubject({
            name: '',
            examDate: '',
            knowledgeLevel: 'intermediate',
            topics: []
        });
        setCurrentSubjectIndex(-1);
    };

    // Cancel editing
    const cancelEdit = () => {
        setCurrentSubject({
            name: '',
            examDate: '',
            knowledgeLevel: 'intermediate',
            topics: []
        });
        setCurrentSubjectIndex(-1);
    };

    // Remove subject
    const removeSubject = (index) => {
        setSubjects(prev => prev.filter((_, i) => i !== index));
        if (currentSubjectIndex === index) {
            cancelEdit();
        }
    };

    // Add topic to current subject
    const addTopic = (topic) => {
        if (!currentSubject.topics.includes(topic)) {
            setCurrentSubject(prev => ({
                ...prev,
                topics: [...prev.topics, topic]
            }));
        }
        setTopicInput('');
    };

    // Remove topic from current subject
    const removeTopic = (topic) => {
        setCurrentSubject(prev => ({
            ...prev,
            topics: prev.topics.filter(t => t !== topic)
        }));
    };

    // Calculate days remaining for a subject
    const getDaysRemaining = (examDate) => {
        if (!examDate) return 0;
        const today = new Date();
        const exam = new Date(examDate);
        const diffTime = exam - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Get earliest exam date
    const getEarliestExamDate = () => {
        if (subjects.length === 0) return null;
        const dates = subjects.filter(s => s.examDate).map(s => new Date(s.examDate));
        if (dates.length === 0) return null;
        return new Date(Math.min(...dates));
    };

    // Navigation
    const nextStep = () => {
        // Auto-save current subject if being edited
        if (currentSubject.name && currentSubjectIndex === -1) {
            saveCurrentSubject();
        }
        if (currentStep < 4) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async () => {
        // Save to Firestore and localStorage
        const studyPlan = {
            subjects,
            preferences,
            goals,
            createdAt: new Date().toISOString()
        };

        // Archive any existing plan to localStorage history before overwriting
        const existingPlanJSON = localStorage.getItem('studyPlan');
        if (existingPlanJSON) {
            try {
                const existingPlan = JSON.parse(existingPlanJSON);
                const historyJSON = localStorage.getItem('planHistory');
                const history = historyJSON ? JSON.parse(historyJSON) : [];
                history.unshift({
                    ...existingPlan,
                    id: Date.now().toString(),
                    archivedAt: new Date().toISOString()
                });
                localStorage.setItem('planHistory', JSON.stringify(history));
            } catch (e) {
                console.error('Error archiving existing plan:', e);
            }
        }

        // Save to localStorage first (synchronous, immediate)
        localStorage.setItem('studyPlan', JSON.stringify(studyPlan));

        // Navigate immediately - don't wait for Firestore
        navigate('/study-plan');

        // Save to Firestore in background (non-blocking)
        if (auth.currentUser) {
            (async () => {
                try {
                    // Save the new plan to Firestore
                    await saveStudyPlan(auth.currentUser.uid, studyPlan);

                    // Award XP for creating a study plan
                    await addXpPoints(auth.currentUser.uid, subjects.length * 50);

                    // Unlock first plan achievement
                    await unlockAchievement(auth.currentUser.uid, 'first_plan', {
                        title: 'First Study Plan',
                        description: 'Created your first study plan',
                        icon: '📚',
                        xpReward: 100
                    });

                    // Unlock multi-subject achievement if applicable
                    if (subjects.length >= 3) {
                        await unlockAchievement(auth.currentUser.uid, 'multi_subject', {
                            title: 'Multi-Tasker',
                            description: 'Added 3 or more subjects to your plan',
                            icon: '🎯',
                            xpReward: 150
                        });
                    }
                } catch (error) {
                    console.error('Error saving to Firestore:', error);
                }
            })();
        }
    };

    const knowledgeLevels = [
        { id: 'beginner', label: 'Beginner', icon: '⭐' },
        { id: 'intermediate', label: 'Intermediate', icon: '⭐⭐' },
        { id: 'advanced', label: 'Advanced', icon: '⭐⭐⭐' },
        { id: 'expert', label: 'Expert', icon: '🔥' }
    ];

    const timePreferences = [
        { id: 'morning', label: 'Morning', time: '6 AM - 12 PM' },
        { id: 'afternoon', label: 'Afternoon', time: '12 PM - 5 PM' },
        { id: 'evening', label: 'Evening', time: '5 PM - 10 PM' }
    ];

    const targetGrades = ['A+', 'A', 'B', 'C', 'Pass'];

    return (
        <div className="scheduling-container">
            {/* Sidebar */}
            <Sidebar activeNav="schedule" />

            {/* Main Content */}
            <main className="scheduling-main">
                {/* Header */}
                <header className="scheduling-header">
                    <div className="header-logo">
                        <img src={schedulerLogo} alt="Scheduler" />
                        <span>Scheduler</span>
                    </div>
                    <nav className="header-nav">
                        <button
                            className="plan-history-btn"
                            onClick={() => { setShowHistoryModal(true); loadPlanHistory(); }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12,6 12,12 16,14" />
                            </svg>
                            Plan History
                        </button>
                    </nav>
                </header>

                {/* Hero Section */}
                <section className="hero-section">
                    <div className="ai-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44A2.5 2.5 0 015.5 17a2.5 2.5 0 01-1.94-4.06A2.5 2.5 0 015.5 9a2.5 2.5 0 011.5-4.56A2.5 2.5 0 019.5 2z" />
                            <path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44A2.5 2.5 0 0018.5 17a2.5 2.5 0 001.94-4.06A2.5 2.5 0 0018.5 9a2.5 2.5 0 00-1.5-4.56A2.5 2.5 0 0014.5 2z" />
                        </svg>
                        AI-Powered Study Planning
                    </div>
                    <h1>{t('scheduling_title')}</h1>
                    <p>Let AI create a personalized study schedule tailored to your goals, timeline, and learning style</p>
                </section>

                {/* Step Indicator */}
                <div className="step-indicator">
                    <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                        <div className="step-number">{currentStep > 1 ? '✓' : '1'}</div>
                        <span>Basic Info</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                        <div className="step-number">{currentStep > 2 ? '✓' : '2'}</div>
                        <span>Preferences</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
                        <div className="step-number">{currentStep > 3 ? '✓' : '3'}</div>
                        <span>Goals</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
                        <div className="step-number">✓</div>
                        <span>Review</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="content-area">
                    {/* Form Panel */}
                    <div className="form-panel">
                        {/* Step 1: Basic Info */}
                        {currentStep === 1 && (
                            <div className="step-content">
                                <h2>Tell us about your subjects</h2>

                                {/* Added Subjects List */}
                                {subjects.length > 0 && (
                                    <div className="added-subjects-list">
                                        <label>Added Subjects ({subjects.length})</label>
                                        <div className="subjects-cards">
                                            {subjects.map((subject, index) => (
                                                <div key={index} className={`subject-card ${currentSubjectIndex === index ? 'editing' : ''}`}>
                                                    <div className="subject-card-header">
                                                        <span className="subject-name">{subject.name}</span>
                                                        <div className="subject-card-actions">
                                                            <button
                                                                className="edit-btn"
                                                                onClick={() => editSubject(index)}
                                                                title="Edit"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                className="remove-btn"
                                                                onClick={() => removeSubject(index)}
                                                                title="Remove"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="subject-card-details">
                                                        <span>📅 {subject.examDate || 'No date set'}</span>
                                                        <span>📊 {subject.knowledgeLevel}</span>
                                                        <span>📝 {subject.topics.length} topics</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Add New Subject or Edit Existing */}
                                <div className="subject-form-section">
                                    <label>
                                        {currentSubjectIndex >= 0
                                            ? `Editing: ${currentSubject.name}`
                                            : currentSubject.name
                                                ? `Configure: ${currentSubject.name}`
                                                : 'Add New Subject'
                                        }
                                    </label>

                                    {/* Subject Name Input - only show if not editing */}
                                    {!currentSubject.name && (
                                        <div className="form-group">
                                            <div className="autocomplete-wrapper">
                                                <input
                                                    type="text"
                                                    value={subjectInput}
                                                    onChange={handleSubjectInputChange}
                                                    onFocus={() => subjectInput && setShowSuggestions(true)}
                                                    placeholder="Search for a subject..."
                                                />
                                                {showSuggestions && subjectSuggestions.length > 0 && (
                                                    <div className="suggestions-dropdown">
                                                        {subjectSuggestions.map(subject => (
                                                            <button
                                                                key={subject}
                                                                className="suggestion-item"
                                                                onClick={() => selectSubject(subject)}
                                                            >
                                                                {subject}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Subject Configuration - show when subject is selected */}
                                    {currentSubject.name && (
                                        <div className="subject-config">
                                            {/* Exam Date */}
                                            <div className="form-group">
                                                <label>Exam Date for {currentSubject.name}</label>
                                                <div className="date-input-wrapper">
                                                    <input
                                                        type="date"
                                                        min={new Date().toISOString().split('T')[0]}
                                                        value={currentSubject.examDate}
                                                        onChange={(e) => setCurrentSubject(prev => ({
                                                            ...prev,
                                                            examDate: e.target.value
                                                        }))}
                                                    />
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Knowledge Level */}
                                            <div className="form-group">
                                                <label>Knowledge Level in {currentSubject.name}</label>
                                                <div className="level-options">
                                                    {knowledgeLevels.map(level => (
                                                        <button
                                                            key={level.id}
                                                            className={`level-btn ${currentSubject.knowledgeLevel === level.id ? 'active' : ''}`}
                                                            onClick={() => setCurrentSubject(prev => ({
                                                                ...prev,
                                                                knowledgeLevel: level.id
                                                            }))}
                                                        >
                                                            <span className="level-icon">{level.icon}</span>
                                                            <span>{level.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Topics */}
                                            <div className="form-group">
                                                <label>Topics to Cover in {currentSubject.name}</label>
                                                <div className="topic-input-wrapper">
                                                    <input
                                                        type="text"
                                                        value={topicInput}
                                                        onChange={(e) => setTopicInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && topicInput) {
                                                                addTopic(topicInput);
                                                            }
                                                        }}
                                                        placeholder="Enter a topic"
                                                        list="topic-suggestions"
                                                    />
                                                    <datalist id="topic-suggestions">
                                                        {availableTopics
                                                            .filter(t => !currentSubject.topics.includes(t))
                                                            .slice(0, 10)
                                                            .map(topic => (
                                                                <option key={topic} value={topic} />
                                                            ))}
                                                    </datalist>
                                                    <button
                                                        className="add-topic-btn"
                                                        onClick={() => topicInput && addTopic(topicInput)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                {currentSubject.topics.length > 0 && (
                                                    <div className="selected-tags">
                                                        {currentSubject.topics.map(topic => (
                                                            <span key={topic} className="tag topic-tag">
                                                                {topic}
                                                                <button onClick={() => removeTopic(topic)}>×</button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Save/Cancel Buttons */}
                                            <div className="subject-actions">
                                                <button className="cancel-btn" onClick={cancelEdit}>
                                                    Cancel
                                                </button>
                                                <button className="save-subject-btn" onClick={saveCurrentSubject}>
                                                    {currentSubjectIndex >= 0 ? 'Update Subject' : 'Add Subject'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Preferences */}
                        {currentStep === 2 && (
                            <div className="step-content">
                                <h2>Your Study Preferences</h2>

                                {/* Session Duration */}
                                <div className="form-group">
                                    <label>Session Duration (minutes)</label>
                                    <div className="slider-group">
                                        <input
                                            type="range"
                                            min="15"
                                            max="120"
                                            step="15"
                                            value={preferences.sessionDuration}
                                            onChange={(e) => setPreferences(prev => ({
                                                ...prev,
                                                sessionDuration: parseInt(e.target.value)
                                            }))}
                                        />
                                        <span className="slider-value">{preferences.sessionDuration} min</span>
                                    </div>
                                </div>

                                {/* Preferred Time */}
                                <div className="form-group">
                                    <label>Preferred Study Time</label>
                                    <div className="time-options">
                                        {timePreferences.map(time => (
                                            <button
                                                key={time.id}
                                                className={`time-btn ${preferences.preferredTime === time.id ? 'active' : ''}`}
                                                onClick={() => setPreferences(prev => ({
                                                    ...prev,
                                                    preferredTime: time.id
                                                }))}
                                            >
                                                <span className="time-label">{time.label}</span>
                                                <span className="time-range">{time.time}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Break Interval */}
                                <div className="form-group">
                                    <label>Break Every (minutes)</label>
                                    <div className="slider-group">
                                        <input
                                            type="range"
                                            min="15"
                                            max="90"
                                            step="15"
                                            value={preferences.breakInterval}
                                            onChange={(e) => setPreferences(prev => ({
                                                ...prev,
                                                breakInterval: parseInt(e.target.value)
                                            }))}
                                        />
                                        <span className="slider-value">{preferences.breakInterval} min</span>
                                    </div>
                                </div>

                                {/* Days Per Week */}
                                <div className="form-group">
                                    <label>Study Days Per Week</label>
                                    <div className="days-options">
                                        {[3, 4, 5, 6, 7].map(days => (
                                            <button
                                                key={days}
                                                className={`day-btn ${preferences.daysPerWeek === days ? 'active' : ''}`}
                                                onClick={() => setPreferences(prev => ({
                                                    ...prev,
                                                    daysPerWeek: days
                                                }))}
                                            >
                                                {days}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Goals */}
                        {currentStep === 3 && (
                            <div className="step-content">
                                <h2>Set Your Goals</h2>

                                {/* Target Grade */}
                                <div className="form-group">
                                    <label>Target Grade</label>
                                    <div className="grade-options">
                                        {targetGrades.map(grade => (
                                            <button
                                                key={grade}
                                                className={`grade-btn ${goals.targetGrade === grade ? 'active' : ''}`}
                                                onClick={() => setGoals(prev => ({
                                                    ...prev,
                                                    targetGrade: grade
                                                }))}
                                            >
                                                {grade}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Focus Areas */}
                                <div className="form-group">
                                    <label>Focus Areas</label>
                                    <div className="focus-options">
                                        {[
                                            { id: 'problem-solving', label: 'Problem Solving', icon: '🧮' },
                                            { id: 'theory', label: 'Theory & Concepts', icon: '📚' },
                                            { id: 'practice', label: 'Practice Questions', icon: '✏️' },
                                            { id: 'revision', label: 'Revision', icon: '🔄' }
                                        ].map(focus => (
                                            <button
                                                key={focus.id}
                                                className={`focus-btn ${goals.focusAreas.includes(focus.id) ? 'active' : ''}`}
                                                onClick={() => {
                                                    setGoals(prev => ({
                                                        ...prev,
                                                        focusAreas: prev.focusAreas.includes(focus.id)
                                                            ? prev.focusAreas.filter(f => f !== focus.id)
                                                            : [...prev.focusAreas, focus.id]
                                                    }));
                                                }}
                                            >
                                                <span>{focus.icon}</span>
                                                <span>{focus.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Priority Subject */}
                                {subjects.length > 1 && (
                                    <div className="form-group">
                                        <label>Priority Subject</label>
                                        <select
                                            value={goals.prioritySubject}
                                            onChange={(e) => setGoals(prev => ({
                                                ...prev,
                                                prioritySubject: e.target.value
                                            }))}
                                        >
                                            <option value="">Select priority subject</option>
                                            {subjects.map(subject => (
                                                <option key={subject.name} value={subject.name}>
                                                    {subject.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 4: Review */}
                        {currentStep === 4 && (
                            <div className="step-content">
                                <h2>Review Your Plan</h2>
                                <div className="review-summary">
                                    <div className="review-section">
                                        <h3>📚 Subjects ({subjects.length})</h3>
                                        {subjects.map((subject, index) => (
                                            <div key={index} className="review-subject-item">
                                                <strong>{subject.name}</strong>
                                                <span>Exam: {subject.examDate || 'Not set'}</span>
                                                <span>Level: {subject.knowledgeLevel}</span>
                                                <span>{subject.topics.length} topics</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="review-section">
                                        <h3>⚡ Preferences</h3>
                                        <p>{preferences.sessionDuration} min sessions, {preferences.preferredTime}</p>
                                        <p>{preferences.daysPerWeek} days/week, break every {preferences.breakInterval} min</p>
                                    </div>

                                    <div className="review-section">
                                        <h3>🎯 Goals</h3>
                                        <p>Target: {goals.targetGrade}</p>
                                        <p>Focus: {goals.focusAreas.join(', ')}</p>
                                        {goals.prioritySubject && <p>Priority: {goals.prioritySubject}</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="form-navigation">
                            {currentStep > 1 && (
                                <button className="nav-btn prev-btn" onClick={prevStep}>
                                    ← Previous
                                </button>
                            )}
                            {currentStep < 4 ? (
                                <button
                                    className="nav-btn next-btn"
                                    onClick={nextStep}
                                    disabled={currentStep === 1 && subjects.length === 0 && !currentSubject.name}
                                >
                                    Next Step →
                                </button>
                            ) : (
                                <button
                                    className="nav-btn submit-btn"
                                    onClick={handleSubmit}
                                    disabled={subjects.length === 0}
                                >
                                    Generate Plan 🚀
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className="preview-panel">
                        <div className="preview-header">
                            <div className="preview-icon">📊</div>
                            <div>
                                <h3>Study Plan Preview</h3>
                                <p>Real-time preview of your plan</p>
                            </div>
                        </div>

                        {subjects.length > 0 || currentSubject.name ? (
                            <>
                                {/* All Subjects Preview */}
                                {subjects.map((subject, index) => (
                                    <div key={index} className="preview-section">
                                        <div className="preview-subject">
                                            <div className="subject-icon">📖</div>
                                            <div className="subject-info">
                                                <h4>{subject.name}</h4>
                                                <span className="level-badge">{subject.knowledgeLevel} Level</span>
                                            </div>
                                        </div>
                                        {subject.topics.length > 0 && (
                                            <div className="preview-topics">
                                                {subject.topics.slice(0, 3).map(topic => (
                                                    <span key={topic} className="topic-chip">{topic}</span>
                                                ))}
                                                {subject.topics.length > 3 && (
                                                    <span className="topic-chip more">+{subject.topics.length - 3}</span>
                                                )}
                                            </div>
                                        )}
                                        {subject.examDate && (
                                            <div className="preview-exam-date">
                                                📅 {new Date(subject.examDate).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })} ({getDaysRemaining(subject.examDate)} days)
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Currently editing subject */}
                                {currentSubject.name && currentSubjectIndex === -1 && (
                                    <div className="preview-section preview-editing">
                                        <div className="editing-badge">✏️ Editing</div>
                                        <div className="preview-subject">
                                            <div className="subject-icon">📖</div>
                                            <div className="subject-info">
                                                <h4>{currentSubject.name}</h4>
                                                <span className="level-badge">{currentSubject.knowledgeLevel} Level</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Schedule Preview */}
                                <div className="preview-section">
                                    <h4>Schedule</h4>
                                    <div className="schedule-info">
                                        <div className="info-row">
                                            <span>☀️ {preferences.preferredTime.charAt(0).toUpperCase() + preferences.preferredTime.slice(1)} sessions</span>
                                        </div>
                                        <div className="info-row">
                                            <span>⏱ {preferences.sessionDuration} min per session</span>
                                        </div>
                                        <div className="info-row">
                                            <span>☕ Breaks every {preferences.breakInterval} min</span>
                                        </div>
                                        <div className="info-row">
                                            <span>📅 {preferences.daysPerWeek} days/week</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Target Goal */}
                                <div className="preview-section">
                                    <div className="target-goal">
                                        <h4>Target Goal</h4>
                                        <span className="grade-badge">{goals.targetGrade}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="preview-empty">
                                <div className="empty-icon">📝</div>
                                <p>Add subjects to see your study plan preview</p>
                            </div>
                        )}
                    </div>
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
        </div>
    );
};

export default Scheduling;
