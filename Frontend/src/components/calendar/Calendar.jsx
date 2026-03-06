import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { getStudyPlan, getCalendarEvents, saveCalendarEvent, deleteCalendarEvent } from '../../services/firestoreService';
import ReminderSettings from '../settings/ReminderSettings';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './Calendar.css';

const Calendar = () => {
    const navigate = useNavigate();
    const [activeNav, setActiveNav] = useState('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewType, setViewType] = useState('monthly'); // weekly, monthly
    const [studyPlan, setStudyPlan] = useState(null);
    const [events, setEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showMenuDropdown, setShowMenuDropdown] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '',
        type: 'exam',
        time: '09:00',
        description: ''
    });

    // Event types with colors
    const eventTypes = [
        { id: 'exam', label: 'Exam', color: '#EF4444', icon: '📝' },
        { id: 'group-study', label: 'Group Study', color: '#3B82F6', icon: '👥' },
        { id: 'revision', label: 'Revision', color: '#10B981', icon: '📚' },
        { id: 'assignment', label: 'Assignment', color: '#F59E0B', icon: '📋' },
        { id: 'other', label: 'Other', color: '#8B5CF6', icon: '📌' }
    ];

    // Load data
    useEffect(() => {
        const loadData = async () => {
            // Load from localStorage first
            const cachedPlan = localStorage.getItem('studyPlan');
            if (cachedPlan) {
                try {
                    setStudyPlan(JSON.parse(cachedPlan));
                } catch (e) {
                    console.error('Error parsing cached plan:', e);
                }
            }

            // Load events from localStorage
            const cachedEvents = localStorage.getItem('calendarEvents');
            if (cachedEvents) {
                try {
                    setEvents(JSON.parse(cachedEvents));
                } catch (e) {
                    console.error('Error parsing cached events:', e);
                }
            }

            // Then sync from Firestore
            if (auth.currentUser) {
                try {
                    const planResult = await getStudyPlan(auth.currentUser.uid);
                    if (planResult.success && planResult.data) {
                        setStudyPlan(planResult.data);
                    }

                    const eventsResult = await getCalendarEvents(auth.currentUser.uid);
                    if (eventsResult.success && eventsResult.data) {
                        setEvents(eventsResult.data);
                        localStorage.setItem('calendarEvents', JSON.stringify(eventsResult.data));
                    }
                } catch (error) {
                    console.error('Error loading data:', error);
                }
            }
        };
        loadData();
    }, []);

    // Get exam dates from study plan
    const getExamDates = () => {
        if (!studyPlan || !studyPlan.subjects) return [];

        return studyPlan.subjects
            .filter(s => s.examDate)
            .map(s => ({
                id: `exam-${s.name}`,
                title: `${s.name} Exam`,
                date: s.examDate,
                type: 'exam',
                isFromPlan: true,
                color: '#EF4444',
                icon: '📝'
            }));
    };

    // Combine exam dates with custom events
    const getAllEvents = () => {
        const examDates = getExamDates();
        const customEvents = events.map(e => ({
            ...e,
            color: eventTypes.find(t => t.id === e.type)?.color || '#8B5CF6',
            icon: eventTypes.find(t => t.id === e.type)?.icon || '📌'
        }));
        return [...examDates, ...customEvents];
    };

    // Get days for current view (week/month)
    const getCalendarDays = (date, view) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = [];

        if (view === 'weekly') {
            const curr = new Date(date);
            const first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week

            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(curr);
                dayDate.setDate(first + i);
                days.push({
                    date: dayDate,
                    isCurrentMonth: dayDate.getMonth() === month
                });
            }
        } else {
            // Monthly view
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDay = firstDay.getDay();

            // Previous month days
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            for (let i = startingDay - 1; i >= 0; i--) {
                days.push({
                    date: new Date(year, month - 1, prevMonthLastDay - i),
                    isCurrentMonth: false
                });
            }

            // Current month days
            for (let i = 1; i <= daysInMonth; i++) {
                days.push({
                    date: new Date(year, month, i),
                    isCurrentMonth: true
                });
            }

            // Next month days to fill grid (6 rows = 42 days)
            const remainingDays = 42 - days.length;
            for (let i = 1; i <= remainingDays; i++) {
                days.push({
                    date: new Date(year, month + 1, i),
                    isCurrentMonth: false
                });
            }
        }

        return days;
    };

    // Get events for a specific date
    const getEventsForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return getAllEvents().filter(e => e.date === dateStr);
    };

    // Navigate calendar
    const navigateCalendar = (direction) => {
        const newDate = new Date(currentDate);
        if (viewType === 'weekly') {
            newDate.setDate(newDate.getDate() + (direction * 7));
        } else {
            newDate.setMonth(newDate.getMonth() + direction);
        }
        setCurrentDate(newDate);
    };

    // Handle date click
    const handleDateClick = (date) => {
        setSelectedDate(date);
        setNewEvent({
            title: '',
            type: 'exam',
            time: '09:00',
            description: ''
        });
        setShowEventModal(true);
    };

    // Save new event
    const handleSaveEvent = async () => {
        if (!newEvent.title.trim() || !selectedDate) return;

        const eventData = {
            id: `event-${Date.now()}`,
            title: newEvent.title,
            type: newEvent.type,
            date: selectedDate.toISOString().split('T')[0],
            time: newEvent.time,
            description: newEvent.description,
            createdAt: new Date().toISOString()
        };

        const updatedEvents = [...events, eventData];
        setEvents(updatedEvents);
        localStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));

        if (auth.currentUser) {
            await saveCalendarEvent(auth.currentUser.uid, eventData);
        }

        setShowEventModal(false);
        setSelectedDate(null);
    };

    // Delete event
    const handleDeleteEvent = async (eventId) => {
        const updatedEvents = events.filter(e => e.id !== eventId);
        setEvents(updatedEvents);
        localStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));

        if (auth.currentUser) {
            await deleteCalendarEvent(auth.currentUser.uid, eventId);
        }
    };

    // Format header title
    const getHeaderTitle = (date, view) => {
        if (view === 'weekly') {
            const curr = new Date(date);
            const first = curr.getDate() - curr.getDay();
            const firstDate = new Date(curr);
            firstDate.setDate(first);
            const lastDate = new Date(firstDate);
            lastDate.setDate(firstDate.getDate() + 6);

            // If same month
            if (firstDate.getMonth() === lastDate.getMonth()) {
                return `${firstDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
            }
            // If different months/years
            return `${firstDate.toLocaleDateString('en-US', { month: 'short' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
        }
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Check if date is today
    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const days = getCalendarDays(currentDate, viewType);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const allEvents = getAllEvents();

    // Get upcoming events for sidebar
    const getUpcomingEvents = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return allEvents
            .filter(e => new Date(e.date) >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5);
    };

    return (
        <div className="calendar-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <img src={schedulerLogo} alt="Scheduler" className="sidebar-logo-img" />
                </div>

                <nav className="sidebar-nav">
                    {/* Home/Dashboard */}
                    <button
                        className="nav-item"
                        onClick={() => navigate('/dashboard')}
                        title="Dashboard"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <polyline points="9,22 9,12 15,12 15,22" />
                        </svg>
                    </button>

                    {/* Study Plan */}
                    <button
                        className="nav-item"
                        onClick={() => {
                            const plan = localStorage.getItem('studyPlan');
                            navigate(plan ? '/study-plan' : '/scheduling');
                        }}
                        title="Study Plan"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                    </button>

                    {/* Analytics */}
                    <button
                        className="nav-item"
                        onClick={() => navigate('/analytics')}
                        title="Analytics"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                    </button>

                    {/* Calendar - Active */}
                    <button
                        className="nav-item active"
                        title="Calendar"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </button>

                    {/* Gamification */}
                    <button
                        className="nav-item"
                        onClick={() => navigate('/gamification')}
                        title="Gamification"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
                            <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
                            <path d="M4 22h16" />
                            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                            <path d="M18 2H6v7a6 6 0 0012 0V2z" />
                        </svg>
                    </button>

                    {/* AI Assistant */}
                    <button
                        className="nav-item"
                        onClick={() => navigate('/ai-assistant')}
                        title="AI Assistant"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44A2.5 2.5 0 015.5 17a2.5 2.5 0 01-1.94-4.06A2.5 2.5 0 015.5 9a2.5 2.5 0 011.5-4.56A2.5 2.5 0 019.5 2z" />
                            <path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44A2.5 2.5 0 0018.5 17a2.5 2.5 0 001.94-4.06A2.5 2.5 0 0018.5 9a2.5 2.5 0 00-1.5-4.56A2.5 2.5 0 0014.5 2z" />
                        </svg>
                    </button>

                    {/* Settings */}
                    <button
                        className="nav-item"
                        onClick={() => navigate('/dashboard')}
                        title="Settings"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                    </button>
                </nav>

                <div className="sidebar-bottom">
                    <div className="user-avatar">U</div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="calendar-main">
                {/* Header */}
                <header className="calendar-header">
                    <div className="header-left">
                        <h1>Calendar</h1>
                        <p>Manage your study schedule and exams</p>
                    </div>
                    <div className="header-right">
                        {/* View Toggle */}
                        <div className="view-toggle">
                            <button
                                className={`toggle-btn ${viewType === 'weekly' ? 'active' : ''}`}
                                onClick={() => setViewType('weekly')}
                            >
                                Week
                            </button>
                            <button
                                className={`toggle-btn ${viewType === 'monthly' ? 'active' : ''}`}
                                onClick={() => setViewType('monthly')}
                            >
                                Month
                            </button>
                        </div>

                        {/* 3-dot Menu */}
                        <div className="menu-dropdown-container">
                            <button
                                className="menu-btn"
                                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="5" r="2" />
                                    <circle cx="12" cy="12" r="2" />
                                    <circle cx="12" cy="19" r="2" />
                                </svg>
                            </button>
                            {showMenuDropdown && (
                                <div className="menu-dropdown">
                                    <button onClick={() => {
                                        setShowMenuDropdown(false);
                                        setShowSettingsModal(true);
                                    }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                            <path d="M13.73 21a2 2 0 01-3.46 0" />
                                        </svg>
                                        Reminder Settings
                                    </button>
                                    <button onClick={() => { setShowMenuDropdown(false); }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        Sync with Google
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="calendar-content">
                    {/* Calendar Grid */}
                    <div className="calendar-grid-container">
                        {/* Month Navigation */}
                        <div className="month-navigation">
                            <button className="nav-arrow" onClick={() => navigateCalendar(-1)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <h2>{getHeaderTitle(currentDate, viewType)}</h2>
                            <button className="nav-arrow" onClick={() => navigateCalendar(1)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                            <button className="today-btn" onClick={() => setCurrentDate(new Date())}>
                                Today
                            </button>
                        </div>

                        {/* Calendar Grid */}
                        <div className={`calendar-grid ${viewType}`}>
                            {/* Week day headers */}
                            {weekDays.map(day => (
                                <div key={day} className="calendar-header-cell">
                                    {day}
                                </div>
                            ))}

                            {/* Day cells */}
                            {days.map((dayObj, index) => {
                                const dayEvents = getEventsForDate(dayObj.date);
                                const isCurrentDay = isToday(dayObj.date);

                                return (
                                    <div
                                        key={index}
                                        className={`calendar-day ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isCurrentDay ? 'today' : ''}`}
                                        onClick={() => handleDateClick(dayObj.date)}
                                    >
                                        <span className="day-number">{dayObj.date.getDate()}</span>
                                        <div className="day-events">
                                            {dayEvents.slice(0, 2).map((event, i) => (
                                                <div
                                                    key={i}
                                                    className="event-dot"
                                                    style={{ backgroundColor: event.color }}
                                                    title={event.title}
                                                >
                                                    <span className="event-icon">{event.icon}</span>
                                                    <span className="event-title">{event.title}</span>
                                                </div>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <span className="more-events">+{dayEvents.length - 2}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Upcoming Events Sidebar */}
                    <div className="upcoming-events">
                        {/* New Event Button */}
                        <button
                            className="new-event-btn"
                            onClick={() => {
                                setSelectedDate(new Date());
                                setNewEvent({
                                    title: '',
                                    type: 'exam',
                                    time: '09:00',
                                    description: ''
                                });
                                setShowEventModal(true);
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            New Event
                        </button>

                        <h3>📅 Upcoming Events</h3>
                        <div className="events-list">
                            {getUpcomingEvents().length > 0 ? (
                                getUpcomingEvents().map((event, index) => (
                                    <div key={index} className="event-card">
                                        <div className="event-date-badge" style={{ backgroundColor: event.color }}>
                                            {new Date(event.date).getDate()}
                                            <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                        </div>
                                        <div className="event-info">
                                            <h4>{event.title}</h4>
                                            <p>{event.time || 'All day'}</p>
                                            <span className="event-type-badge" style={{ backgroundColor: event.color + '20', color: event.color }}>
                                                {event.icon} {eventTypes.find(t => t.id === event.type)?.label || 'Event'}
                                            </span>
                                        </div>
                                        {!event.isFromPlan && (
                                            <button
                                                className="delete-event-btn"
                                                onClick={() => handleDeleteEvent(event.id)}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="no-events">
                                    <span>📭</span>
                                    <p>No upcoming events</p>
                                    <small>Click on a date to add an event</small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Event Modal */}
            {showEventModal && (
                <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
                    <div className="event-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Event</h2>
                            <span className="selected-date">
                                {selectedDate?.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </span>
                            <button className="close-btn" onClick={() => setShowEventModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Event Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter event name..."
                                    value={newEvent.title}
                                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>Event Type</label>
                                <div className="event-type-grid">
                                    {eventTypes.map(type => (
                                        <button
                                            key={type.id}
                                            className={`type-btn ${newEvent.type === type.id ? 'active' : ''}`}
                                            style={{
                                                borderColor: newEvent.type === type.id ? type.color : 'transparent',
                                                backgroundColor: newEvent.type === type.id ? type.color + '15' : ''
                                            }}
                                            onClick={() => setNewEvent({ ...newEvent, type: type.id })}
                                        >
                                            <span>{type.icon}</span>
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Time</label>
                                <input
                                    type="time"
                                    value={newEvent.time}
                                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Description (Optional)</label>
                                <textarea
                                    placeholder="Add notes or description..."
                                    value={newEvent.description}
                                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={() => setShowEventModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="save-btn"
                                onClick={handleSaveEvent}
                                disabled={!newEvent.title.trim()}
                            >
                                Save Event
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Reminder Settings Modal */}
            {showSettingsModal && (
                <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
                    <div className="settings-modal-container" onClick={e => e.stopPropagation()}>
                        <ReminderSettings isModal={true} onClose={() => setShowSettingsModal(false)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
