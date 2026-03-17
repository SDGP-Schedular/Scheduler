import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { LanguageProvider } from './i18n/LanguageContext'
import { auth } from './config/firebase'
import { initializeNotifications } from './services/notificationService'
import SignIn from './components/auth/SignIn'
import SignUp from './components/auth/SignUp'
import Dashboard from './components/dashboard/Dashboard'
import Scheduling from './components/scheduling/Scheduling'
import StudyPlan from './components/studyplan/StudyPlan'
import AIAssistant from './components/ai/AIAssistant'
import Analytics from './components/analytics/Analytics'
import Calendar from './components/calendar/Calendar'
import ReminderSettings from './components/settings/ReminderSettings'
import Settings from './components/settings/Settings'
import Gamification from './components/gamification/Gamification'
import Quiz from './components/quiz/Quiz'
import QuizResults from './components/quiz/QuizResults'
import UserProfile from './components/profile/UserProfile'
import './App.css'

function App() {
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                initializeNotifications().catch((error) => {
                    console.warn('Notification initialization failed:', error)
                })
            }
        })

        return () => unsubscribe()
    }, [])

    return (
        <LanguageProvider>
            <div className="app">
                <Routes>
                    {/* Default route - Sign In for returning users */}
                    <Route path="/" element={<SignIn />} />
                    <Route path="/signin" element={<SignIn />} />

                    {/* Sign Up for new users */}
                    <Route path="/signup" element={<SignUp />} />

                    {/* Dashboard - Home screen after Sign In */}
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* Scheduling - for new Sign Up users to set up their schedule */}
                    <Route path="/scheduling" element={<Scheduling />} />

                    {/* Study Plan - view generated study plan */}
                    <Route path="/study-plan" element={<StudyPlan />} />

                    {/* AI Assistant - Chat with AI */}
                    <Route path="/ai-assistant" element={<AIAssistant />} />

                    {/* Analytics - Performance tracking */}
                    <Route path="/analytics" element={<Analytics />} />

                    {/* Calendar - Study schedule and events */}
                    <Route path="/calendar" element={<Calendar />} />

                    {/* Gamification - Quiz and achievements */}
                    <Route path="/gamification" element={<Gamification />} />

                    {/* Quiz - Interactive quiz interface */}
                    <Route path="/quiz" element={<Quiz />} />

                    {/* Quiz Results - Quiz completion screen */}
                    <Route path="/quiz-results" element={<QuizResults />} />

                    {/* User Profile */}
                    <Route path="/profile" element={<UserProfile />} />

                    {/* Settings */}
                    <Route path="/settings" element={<Settings />} />

                    {/* Reminder Settings (legacy) */}
                    <Route path="/reminder-settings" element={<ReminderSettings />} />

                    {/* Catch all - redirect to sign in */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </LanguageProvider>
    )
}

export default App




