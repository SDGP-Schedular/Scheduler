import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth, setAuthPersistence } from '../../config/firebase';
import robotMascot from '../../assets/robot-mascot.png';
import schedulerLogo from '../../assets/scheduler-logo.png';
import './SignIn.css';

const SignIn = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const handleEmailSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await setAuthPersistence(rememberMe);
            await signInWithEmailAndPassword(auth, formData.email, formData.password);
            navigate('/dashboard');
        } catch (err) {
            console.error('Sign in error:', err);
            switch (err.code) {
                case 'auth/invalid-email':
                    setError('Invalid email address');
                    break;
                case 'auth/user-not-found':
                    setError('No account found with this email');
                    break;
                case 'auth/wrong-password':
                    setError('Incorrect password');
                    break;
                case 'auth/invalid-credential':
                    setError('Invalid email or password');
                    break;
                case 'auth/too-many-requests':
                    setError('Too many attempts. Please try again later');
                    break;
                default:
                    setError('Failed to sign in. Please try again');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');

        try {
            await setAuthPersistence(rememberMe);
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            navigate('/dashboard');
        } catch (err) {
            console.error('Google sign in error:', err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError('Sign in cancelled');
            } else {
                setError('Failed to sign in with Google');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!resetEmail) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetEmailSent(true);
        } catch (err) {
            console.error('Password reset error:', err);
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this email');
            } else {
                setError('Failed to send reset email');
            }
        } finally {
            setLoading(false);
        }
    };

    const closeForgotPasswordModal = () => {
        setShowForgotPassword(false);
        setResetEmail('');
        setResetEmailSent(false);
        setError('');
    };

    return (
        <div className="signin-container">
            {/* Left Panel - Sign In Form */}
            <div className="signin-form-panel">
                <div className="signin-form-content">
                    {/* Logo */}
                    <div className="signin-logo">
                        <img src={schedulerLogo} alt="Scheduler Logo" className="logo-image" />
                        <span className="logo-text">Scheduler</span>
                    </div>
                    <p className="signin-tagline">Your intelligent study companion</p>

                    {/* Welcome Text */}
                    <h1 className="signin-title">Welcome back</h1>
                    <p className="signin-subtitle">Sign in to continue your learning journey</p>

                    {/* Error Message */}
                    {error && <div className="signin-error">{error}</div>}

                    {/* OAuth Buttons */}
                    <div className="oauth-buttons">
                        <button
                            type="button"
                            className="oauth-btn google-btn"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                        >
                            <svg className="oauth-icon" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="signin-divider">
                        <span>or</span>
                    </div>

                    {/* Sign In Form */}
                    <form onSubmit={handleEmailSignIn} className="signin-form">
                        <div className="form-group">
                            <label htmlFor="email">Email address</label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <path d="M22 6L12 13L2 6" />
                                </svg>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="you@example.com"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <circle cx="12" cy="16" r="1" />
                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Enter your password"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="form-options">
                            <label className="checkbox-wrapper">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    disabled={loading}
                                />
                                <span className="checkmark"></span>
                                Remember me
                            </label>
                            <button
                                type="button"
                                className="forgot-password-link"
                                onClick={() => setShowForgotPassword(true)}
                            >
                                Forgot password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="signin-btn"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                    {/* Sign Up Link */}
                    <p className="signup-prompt">
                        Don't have an account? <a href="/signup" className="signup-link">Sign up</a>
                    </p>
                </div>
            </div>

            {/* Right Panel - Features */}
            <div className="signin-features-panel">
                <div className="features-content">
                    {/* Decorative Elements */}
                    <div className="decorative-circle circle-1"></div>
                    <div className="decorative-circle circle-2"></div>
                    <div className="decorative-circle circle-3"></div>

                    {/* Robot Mascot */}
                    <div className="mascot-container">
                        <img src={robotMascot} alt="Scheduler Robot Mascot" className="mascot-image" />
                    </div>

                    {/* Feature Cards */}
                    <div className="feature-cards">
                        <div className="feature-card">
                            <div className="feature-icon ai-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" />
                                    <path d="M14 9l-3 3 3 3" />
                                </svg>
                            </div>
                            <div className="feature-text">
                                <h3>AI-Powered Planning</h3>
                                <p>Smart study schedules tailored to you</p>
                            </div>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon progress-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                </svg>
                            </div>
                            <div className="feature-text">
                                <h3>Track Progress</h3>
                                <p>Visualize your learning journey</p>
                            </div>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon goals-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 15l-2 5-1-1-1 1 2-5" />
                                    <path d="M12 15l2 5 1-1 1 1-2-5" />
                                    <circle cx="12" cy="8" r="7" />
                                    <path d="M12 5v6l3 3" />
                                </svg>
                            </div>
                            <div className="feature-text">
                                <h3>Achieve Goals</h3>
                                <p>Reach your academic milestones</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div className="modal-overlay" onClick={closeForgotPasswordModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeForgotPasswordModal}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>

                        {resetEmailSent ? (
                            <div className="modal-success">
                                <div className="success-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9 12l2 2 4-4" />
                                    </svg>
                                </div>
                                <h2>Check your email</h2>
                                <p>We've sent a password reset link to <strong>{resetEmail}</strong></p>
                                <button className="signin-btn" onClick={closeForgotPasswordModal}>
                                    Back to Sign In
                                </button>
                            </div>
                        ) : (
                            <>
                                <h2>Reset your password</h2>
                                <p>Enter your email address and we'll send you a link to reset your password.</p>

                                {error && <div className="signin-error">{error}</div>}

                                <form onSubmit={handleForgotPassword}>
                                    <div className="form-group">
                                        <label htmlFor="resetEmail">Email address</label>
                                        <div className="input-wrapper">
                                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                                <path d="M22 6L12 13L2 6" />
                                            </svg>
                                            <input
                                                type="email"
                                                id="resetEmail"
                                                value={resetEmail}
                                                onChange={(e) => {
                                                    setResetEmail(e.target.value);
                                                    setError('');
                                                }}
                                                placeholder="you@example.com"
                                                required
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="signin-btn"
                                        disabled={loading}
                                    >
                                        {loading ? 'Sending...' : 'Send reset link'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SignIn;
