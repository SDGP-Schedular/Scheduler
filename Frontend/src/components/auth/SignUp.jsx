import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    updateProfile,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink
} from 'firebase/auth';
import { auth, setAuthPersistence } from '../../config/firebase';
import schedulerLogo from '../../assets/scheduler-logo.png';
import aiBrain from '../../assets/ai-brain.png';
import './SignUp.css';

const SignUp = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        phone: '',
        otp: '',
        password: '',
        confirmPassword: ''
    });
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [emailSentMessage, setEmailSentMessage] = useState('');

    // Check if user is coming back from email link verification
    useEffect(() => {
        if (isSignInWithEmailLink(auth, window.location.href)) {
            // Get the email from localStorage (we saved it when sending the link)
            let email = localStorage.getItem('emailForSignIn');

            if (!email) {
                // If email is not in localStorage, ask user to provide it
                email = window.prompt('Please provide your email for confirmation');
            }

            if (email) {
                setLoading(true);
                signInWithEmailLink(auth, email, window.location.href)
                    .then((result) => {
                        // Clear the saved email
                        localStorage.removeItem('emailForSignIn');
                        // Email is verified, user is signed in
                        setOtpVerified(true);
                        setFormData(prev => ({ ...prev, email: email }));
                        // Sign out so user can complete the full registration
                        auth.signOut();
                        setEmailSentMessage('✓ Email verified successfully! Complete your registration below.');
                    })
                    .catch((error) => {
                        console.error('Email link sign-in error:', error);
                        setError('Email verification failed. Please try again.');
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            }
        }
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
        setFieldErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Invalid email format';
        }

        if (!formData.phone) {
            errors.phone = 'Phone number is required';
        }

        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleGetOTP = async () => {
        if (!formData.email) {
            setFieldErrors({ email: 'Enter email to verify' });
            return;
        }

        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            setFieldErrors({ email: 'Please enter a valid email address' });
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Configure the email link settings
            const actionCodeSettings = {
                // URL to redirect back to after email verification
                url: window.location.origin + '/signup',
                handleCodeInApp: true,
            };

            // Send the email verification link
            await sendSignInLinkToEmail(auth, formData.email, actionCodeSettings);

            // Save the email to localStorage for verification when user returns
            localStorage.setItem('emailForSignIn', formData.email);

            setOtpSent(true);
            setEmailSentMessage(`Verification link sent to ${formData.email}. Please check your inbox and click the link to verify.`);
        } catch (err) {
            console.error('Send email link error:', err);
            switch (err.code) {
                case 'auth/invalid-email':
                    setError('Invalid email address');
                    break;
                case 'auth/missing-android-pkg-name':
                case 'auth/missing-continue-uri':
                case 'auth/missing-ios-bundle-id':
                case 'auth/invalid-continue-uri':
                case 'auth/unauthorized-continue-uri':
                    setError('Configuration error. Please contact support.');
                    break;
                default:
                    setError('Failed to send verification email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = () => {
        // This is now handled automatically when user clicks the email link
        // Keep for UI purposes - show message to check email
        setError('Please click the verification link sent to your email.');
    };

    const handleSignUp = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            await setAuthPersistence(rememberMe);
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            // Update user profile with phone number (stored in displayName for now)
            await updateProfile(userCredential.user, {
                displayName: formData.phone
            });

            // Redirect to dashboard after successful sign up
            navigate('/dashboard');
        } catch (err) {
            console.error('Sign up error:', err);
            switch (err.code) {
                case 'auth/email-already-in-use':
                    setError('An account with this email already exists');
                    break;
                case 'auth/invalid-email':
                    setError('Invalid email address');
                    break;
                case 'auth/weak-password':
                    setError('Password is too weak');
                    break;
                default:
                    setError('Failed to create account. Please try again');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setLoading(true);
        setError('');

        try {
            await setAuthPersistence(rememberMe);
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            navigate('/dashboard');
        } catch (err) {
            console.error('Google sign up error:', err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError('Sign up cancelled');
            } else {
                setError('Failed to sign up with Google');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-container">
            {/* Left Panel - Branding */}
            <div className="signup-branding-panel">
                <div className="branding-content">
                    {/* Logo */}
                    <div className="signup-logo">
                        <img src={schedulerLogo} alt="Scheduler Logo" className="logo-image" />
                        <span className="logo-text">Scheduler</span>
                    </div>
                    <p className="signup-tagline">Your intelligent study companion</p>

                    {/* Welcome Text */}
                    <h1 className="signup-title">Welcome To Scheduler</h1>
                    <p className="signup-subtitle">Sign up to continue your learning journey</p>

                    {/* OAuth Buttons */}
                    <div className="oauth-buttons">
                        <button
                            type="button"
                            className="oauth-btn google-btn"
                            onClick={handleGoogleSignUp}
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

                    {/* AI Brain Image */}
                    <div className="brain-container">
                        <img src={aiBrain} alt="AI Brain" className="brain-image" />
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="decorative-circle circle-1"></div>
                <div className="decorative-circle circle-2"></div>
            </div>

            {/* Right Panel - Form */}
            <div className="signup-form-panel">
                <div className="signup-form-content">
                    {/* Decorative Circle */}
                    <div className="form-decorative-circle"></div>

                    {/* Success/Error Messages */}
                    {emailSentMessage && (
                        <div className={`signup-message ${otpVerified ? 'success' : 'info'}`}>
                            {emailSentMessage}
                        </div>
                    )}
                    {error && <div className="signup-error">{error}</div>}

                    {/* Sign Up Form */}
                    <form onSubmit={handleSignUp} className="signup-form">
                        {/* Email with OTP Button */}
                        <div className="form-group">
                            <label htmlFor="email">Email address</label>
                            <div className="input-with-button">
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
                                        disabled={loading}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className={`otp-btn ${otpVerified ? 'verified' : ''}`}
                                    onClick={handleGetOTP}
                                    disabled={loading || otpVerified}
                                >
                                    {loading ? 'Sending...' : otpVerified ? '✓ Verified' : otpSent ? 'Resend' : 'Verify Email'}
                                </button>
                            </div>
                            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
                        </div>

                        {/* Phone Number */}
                        <div className="form-group">
                            <label htmlFor="phone">Phone number</label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                                </svg>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="+94 XX XXX XXXX"
                                    disabled={loading}
                                />
                            </div>
                            {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
                        </div>

                        {/* Password */}
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
                            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
                        </div>

                        {/* Confirm Password */}
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm your password</label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <circle cx="12" cy="16" r="1" />
                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Enter your password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? (
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
                            {fieldErrors.confirmPassword && <span className="field-error">{fieldErrors.confirmPassword}</span>}
                        </div>

                        {/* Remember Me */}
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

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            className="signup-btn"
                            disabled={loading}
                        >
                            {loading ? 'Creating account...' : 'Sign in'}
                        </button>
                    </form>

                    {/* Sign In Link */}
                    <div className="signin-prompt-container">
                        <div className="signin-prompt-decoration"></div>
                        <p className="signin-prompt">
                            Already have an account? <Link to="/signin" className="signin-link">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
