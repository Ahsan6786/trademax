import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { authService } from '../../services/auth';
import { AppleSuccessOverlay } from './AppleSuccessOverlay';
import { NotificationPermissionModal } from '../common/NotificationPermissionModal';
import './AuthOverlay.css';

export const AuthOverlay = forwardRef((props, ref) => {
  const overlayRef = useRef(null);
  const originBtnRef = useRef(null);
  const closeTimerRef = useRef(null);

  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    reference: 'Social Media (Instagram, YouTube, X)',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [backendError, setBackendError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  const handleClose = () => {
    setShowWelcome(false);
    setShowPushPrompt(false);
    setRegisteredUser(null);
    setPendingUser(null);
    const btn = originBtnRef.current;
    const overlay = overlayRef.current;
    if (!overlay) return;

    overlay.classList.remove('show');

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    if (btn && !isMobile) {
      const rect = btn.getBoundingClientRect();
      const radius = window.getComputedStyle(btn).borderRadius || '8px';
      overlay.classList.remove('full');
      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.borderRadius = radius;
    }

    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('auth-open');

    closeTimerRef.current = setTimeout(() => {
      overlay.classList.remove('open', 'full');
      if (btn) {
        btn.style.visibility = '';
      }
      originBtnRef.current = null;
      setBackendError('');
    }, 450);
  };

  // Expose open function to parent/Navbar
  useImperativeHandle(ref, () => ({
    openFrom: (btn, initialMode = 'register') => {
      if (!overlayRef.current) return;
      clearTimeout(closeTimerRef.current);
      originBtnRef.current = btn;
      setMode(initialMode);
      setErrors({});
      setBackendError('');

      const overlay = overlayRef.current;
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

      if (isMobile) {
        // High-performance mobile path: bypass geometry layout reflows
        overlay.style.transition = 'none';
        overlay.style.left = '0px';
        overlay.style.top = '0px';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.borderRadius = '0px';

        overlay.classList.add('open', 'full');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('auth-open');

        requestAnimationFrame(() => {
          overlay.style.transition = '';
          overlay.classList.add('show');
        });
      } else {
        // Desktop smooth expanding path
        const rect = btn ? btn.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
        const radius = btn ? (window.getComputedStyle(btn).borderRadius || '8px') : '8px';

        overlay.style.transition = 'none';
        overlay.classList.remove('full', 'show');

        overlay.style.left = `${rect.left}px`;
        overlay.style.top = `${rect.top}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.borderRadius = radius;

        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');

        void overlay.offsetWidth; // Commit start position

        overlay.style.transition = '';
        document.body.classList.add('auth-open');
        if (btn) btn.style.visibility = 'hidden';

        requestAnimationFrame(() => {
          overlay.classList.add('full');
          overlay.classList.add('show');
          overlay.style.borderRadius = '0px';
        });
      }
    },
    close: () => {
      handleClose();
    },
  }));

  // Close on Escape key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
    if (backendError) {
      setBackendError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendError('');
    const newErrors = {};

    if (mode === 'register') {
      if (!formData.name.trim()) {
        newErrors.name = 'Full name is required';
      }
      if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Valid email address is required';
      }
      if (!formData.password || formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (!formData.reference) {
        newErrors.reference = 'Please select a reference';
      }
    } else {
      if (!formData.email.trim()) {
        newErrors.email = 'Email or mobile number is required';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        const data = await authService.register({
          name: formData.name.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          reference: formData.reference || 'Social Media (Instagram, YouTube, X)',
          password: formData.password,
        });

        // Immediately trigger Welcome.json Lottie animation on first-time signup
        setRegisteredUser(data.user);
        setShowWelcome(true);
      } else {
        const data = await authService.login({
          email: formData.email.trim(),
          password: formData.password,
        });

        // If student account has never seen the welcome animation, show it upon first sign-in
        if (data.user && data.user.role !== 'admin' && !authService.hasSeenWelcome(data.user)) {
          setRegisteredUser(data.user);
          setShowWelcome(true);
          return;
        }

        handleClose();
        if (props.onLoginSuccess) {
          props.onLoginSuccess(data.user);
        }
      }
    } catch (err) {
      setBackendError(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishAuthFlow = (user) => {
    setShowPushPrompt(false);
    setPendingUser(null);
    setRegisteredUser(null);
    handleClose();
    if (props.onRegisterSuccess) {
      props.onRegisterSuccess(user);
    } else if (props.onLoginSuccess) {
      props.onLoginSuccess(user);
    }
  };

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    const completedUser = registeredUser;

    // Check if push notifications are supported and user has not made a decision yet
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      setPendingUser(completedUser);
      setShowPushPrompt(true);
    } else {
      finishAuthFlow(completedUser);
    }
  };

  return (
    <div
      className="auth-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-hidden="true"
    >
      {/* Optimized Ambient Background Swirl (Clean on Mobile) */}
      <div className="auth-bg" aria-hidden="true">
        <i className="b b1"></i>
        <i className="b b2"></i>
        <i className="b b3"></i>
      </div>

      {/* Close Button */}
      <button
        type="button"
        className="auth-close-btn"
        onClick={handleClose}
        aria-label="Close authentication modal"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Main Container */}
      <div className="auth-inner-content">
        {/* Left Column: Brand & Terminal Ecosystem */}
        <div className="auth-left-brand">
          <div className="auth-brand-badge">
            <img src="/tm-logo.png" alt="TRADEMAX" className="auth-brand-logo-img" />
          </div>

          <h2 className="auth-left-title">
            The Institutional Trading Platform.
          </h2>

          <p className="auth-left-subtitle">
            Join thousands of traders mastering quantitative order flow, technical market structure, and disciplined execution.
          </p>

          <ul className="auth-feature-list">
            <li>
              <span className="auth-feature-bullet">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5L6.5 12L13 4.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span>Full curriculum access from foundational to institutional strategies</span>
            </li>
            <li>
              <span className="auth-feature-bullet">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5L6.5 12L13 4.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span>Proprietary simulation terminal with live order book execution</span>
            </li>
            <li>
              <span className="auth-feature-bullet">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5L6.5 12L13 4.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span>Live market breakdown sessions and disciplined risk management models</span>
            </li>
          </ul>
        </div>

        {/* Right Column: Form Panel */}
        <div className="auth-right-form-wrap">
          <div className="auth-form-card">
            {/* Tab Switcher */}
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setMode('register');
                  setErrors({});
                  setBackendError('');
                }}
              >
                Get Started
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setMode('login');
                  setErrors({});
                  setBackendError('');
                }}
              >
                Sign In
              </button>
            </div>

            <div className="auth-form-header">
              <h3>{mode === 'register' ? 'Get Started with TRADEMAX' : 'Sign In to Your Account'}</h3>
              <p>
                {mode === 'register'
                  ? 'Enter your credentials to establish your institutional profile.'
                  : 'Access your active trading courses and terminal simulation.'}
              </p>
            </div>

            {/* Backend Error Alert */}
            {backendError && (
              <div className="auth-backend-error-banner" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{backendError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {mode === 'register' ? (
                <>
                  <div className="auth-field">
                    <label htmlFor="auth-name">FULL NAME</label>
                    <input
                      id="auth-name"
                      type="text"
                      name="name"
                      placeholder="e.g. Alex Henderson"
                      value={formData.name}
                      onChange={handleChange}
                      className={errors.name ? 'invalid' : ''}
                      autoComplete="name"
                      disabled={isSubmitting}
                    />
                    {errors.name && <span className="auth-error-msg">{errors.name}</span>}
                  </div>

                  <div className="auth-field">
                    <label htmlFor="auth-mobile">MOBILE NO</label>
                    <input
                      id="auth-mobile"
                      type="tel"
                      name="mobile"
                      placeholder="e.g. +91 98765 43210"
                      value={formData.mobile}
                      onChange={handleChange}
                      className={errors.mobile ? 'invalid' : ''}
                      autoComplete="tel"
                      disabled={isSubmitting}
                    />
                    {errors.mobile && <span className="auth-error-msg">{errors.mobile}</span>}
                  </div>

                  <div className="auth-field">
                    <label htmlFor="auth-email">EMAIL ADDRESS</label>
                    <input
                      id="auth-email"
                      type="email"
                      name="email"
                      placeholder="trader@domain.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={errors.email ? 'invalid' : ''}
                      autoComplete="email"
                      disabled={isSubmitting}
                    />
                    {errors.email && <span className="auth-error-msg">{errors.email}</span>}
                  </div>

                  {/* Reference Dropdown */}
                  <div className="auth-field">
                    <label htmlFor="auth-reference">REFERENCE</label>
                    <div className="auth-select-wrap">
                      <select
                        id="auth-reference"
                        name="reference"
                        value={formData.reference}
                        onChange={handleChange}
                        className="auth-select"
                        disabled={isSubmitting}
                      >
                        <option value="Social Media (Instagram, YouTube, X)">Social Media (Instagram, YouTube, X)</option>
                        <option value="Friend or Colleague">Friend or Colleague</option>
                        <option value="Trading Community / Discord">Trading Community / Discord</option>
                        <option value="Google / Online Search">Google / Online Search</option>
                        <option value="Mentor / Financial Instructor">Mentor / Financial Instructor</option>
                        <option value="Referral Code / Partner">Referral Code / Partner</option>
                        <option value="Direct / Website">Direct / Website</option>
                        <option value="Other">Other</option>
                      </select>
                      <svg
                        className="auth-select-chevron"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    {errors.reference && <span className="auth-error-msg">{errors.reference}</span>}
                  </div>

                  <div className="auth-field">
                    <label htmlFor="auth-reg-password">PASSWORD</label>
                    <input
                      id="auth-reg-password"
                      type="password"
                      name="password"
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      className={errors.password ? 'invalid' : ''}
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                    {errors.password && <span className="auth-error-msg">{errors.password}</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="auth-field">
                    <label htmlFor="auth-login-email">EMAIL OR MOBILE NO</label>
                    <input
                      id="auth-login-email"
                      type="text"
                      name="email"
                      placeholder="trader@domain.com or mobile"
                      value={formData.email}
                      onChange={handleChange}
                      className={errors.email ? 'invalid' : ''}
                      autoComplete="username"
                      disabled={isSubmitting}
                    />
                    {errors.email && <span className="auth-error-msg">{errors.email}</span>}
                  </div>

                  <div className="auth-field">
                    <div className="auth-field-header">
                      <label htmlFor="auth-login-password">PASSWORD</label>
                      <a href="#forgot" className="auth-forgot-link" onClick={(e) => e.preventDefault()}>
                        Forgot password?
                      </a>
                    </div>
                    <input
                      id="auth-login-password"
                      type="password"
                      name="password"
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className={errors.password ? 'invalid' : ''}
                      autoComplete="current-password"
                      disabled={isSubmitting}
                    />
                    {errors.password && <span className="auth-error-msg">{errors.password}</span>}
                  </div>
                </>
              )}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="auth-btn-loading">
                    <span className="auth-spinner" aria-hidden="true"></span>
                    <span>Processing...</span>
                  </span>
                ) : mode === 'register' ? (
                  'Get Started with TRADEMAX'
                ) : (
                  'Sign In to Terminal'
                )}
              </button>

              <p className="auth-terms-note">
                By continuing, you agree to TRADEMAX's{' '}
                <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a> and{' '}
                <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Welcome.json Lottie Animation Overlay on First-Time Registration */}
      {showWelcome && registeredUser && (
        <AppleSuccessOverlay
          user={registeredUser}
          onContinue={handleWelcomeComplete}
        />
      )}

      {/* Clean, Non-Blocking Web Push Notification Permission Prompt */}
      {showPushPrompt && (
        <NotificationPermissionModal
          isOpen={showPushPrompt}
          onClose={() => finishAuthFlow(pendingUser)}
          onComplete={() => finishAuthFlow(pendingUser)}
          userToken={localStorage.getItem('tm_token')}
        />
      )}
    </div>
  );
});
