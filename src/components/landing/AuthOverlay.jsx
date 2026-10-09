import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import './AuthOverlay.css';

export const AuthOverlay = forwardRef((props, ref) => {
  const overlayRef = useRef(null);
  const originBtnRef = useRef(null);
  const closeTimerRef = useRef(null);

  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    experience: 'Intermediate',
  });
  const [errors, setErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);

  const handleClose = () => {
    const btn = originBtnRef.current;
    const overlay = overlayRef.current;
    if (!overlay) return;

    overlay.classList.remove('show');

    if (btn) {
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
      overlay.classList.remove('open');
      if (btn) {
        btn.style.visibility = '';
      }
      originBtnRef.current = null;
    }, 700);
  };

  const handleAccessDashboard = () => {
    const user = createdUser || {
      name: formData.name || (formData.email ? formData.email.split('@')[0] : 'Trader'),
      email: formData.email || 'student@trademax.com',
    };
    handleClose();
    if (props.onLoginSuccess) {
      props.onLoginSuccess(user);
    }
  };

  // Expose open function to parent/Navbar
  useImperativeHandle(ref, () => ({
    openFrom: (btn, initialMode = 'register') => {
      if (!btn || !overlayRef.current) return;
      clearTimeout(closeTimerRef.current);
      originBtnRef.current = btn;
      setMode(initialMode);
      setIsSuccess(false);
      setErrors({});

      const rect = btn.getBoundingClientRect();
      const radius = window.getComputedStyle(btn).borderRadius || '8px';
      const overlay = overlayRef.current;

      overlay.style.transition = 'none';
      overlay.classList.remove('full', 'show');

      // Set initial geometry exactly matching clicked button
      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.borderRadius = radius;

      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');

      // Force layout reflow to commit start position
      void overlay.offsetWidth;

      overlay.style.transition = '';
      document.body.classList.add('auth-open');
      btn.style.visibility = 'hidden';

      requestAnimationFrame(() => {
        overlay.classList.add('full');
        overlay.classList.add('show');
        overlay.style.borderRadius = '0px';
      });
    },
    close: () => {
      handleClose();
    }
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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (mode === 'register' && !formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Account creation simulation
    setCreatedUser({
      name: formData.name || formData.email.split('@')[0],
      email: formData.email,
    });
    setIsSuccess(true);
  };

  return (
    <div
      className="auth-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-hidden="true"
    >
      {/* Moving Fluid Gradient Swirl Background */}
      <div className="auth-bg" aria-hidden="true">
        <i className="b b1"></i>
        <i className="b b2"></i>
        <i className="b b3"></i>
        <i className="b b4"></i>
        <i className="b b5"></i>
      </div>

      {/* Close Button */}
      <button
        type="button"
        className="auth-close-btn"
        onClick={handleClose}
        aria-label="Close registration modal"
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
          {isSuccess ? (
            <div className="auth-success-card">
              <div className="auth-success-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13L9 17L19 7" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <h3 className="auth-success-title">
                {mode === 'register' ? 'Account Successfully Created!' : 'Welcome Back!'}
              </h3>

              <p className="auth-success-desc">
                Welcome to TRADEMAX, <strong>{createdUser?.name}</strong>. Your trading profile is active and ready for terminal access.
              </p>

              <button
                type="button"
                className="auth-submit-btn"
                onClick={handleAccessDashboard}
              >
                Access Terminal Dashboard
              </button>
            </div>
          ) : (
            <div className="auth-form-card">
              {/* Tab Switcher */}
              <div className="auth-tabs" role="tablist">
                <button
                  type="button"
                  className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => { setMode('register'); setErrors({}); }}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => { setMode('login'); setErrors({}); }}
                >
                  Sign In
                </button>
              </div>

              <div className="auth-form-header">
                <h3>{mode === 'register' ? 'Get Started with TRADEMAX' : 'Sign In to Your Account'}</h3>
                <p>
                  {mode === 'register'
                    ? 'Enter your credentials below to establish your institutional profile.'
                    : 'Access your active trading courses and terminal simulation.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                {mode === 'register' && (
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
                    />
                    {errors.name && <span className="auth-error-msg">{errors.name}</span>}
                  </div>
                )}

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
                  />
                  {errors.email && <span className="auth-error-msg">{errors.email}</span>}
                </div>

                <div className="auth-field">
                  <div className="auth-field-header">
                    <label htmlFor="auth-password">PASSWORD</label>
                    {mode === 'login' && (
                      <a href="#forgot" className="auth-forgot-link" onClick={(e) => e.preventDefault()}>
                        Forgot password?
                      </a>
                    )}
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    name="password"
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? 'invalid' : ''}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  />
                  {errors.password && <span className="auth-error-msg">{errors.password}</span>}
                </div>

                {mode === 'register' && (
                  <div className="auth-field">
                    <label htmlFor="auth-experience">TRADING EXPERIENCE</label>
                    <select
                      id="auth-experience"
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      className="auth-select"
                    >
                      <option value="Beginner">Beginner (Foundations & Basics)</option>
                      <option value="Intermediate">Intermediate (Technical & Order Flow)</option>
                      <option value="Advanced">Advanced (Institutional Execution)</option>
                    </select>
                  </div>
                )}

                <button type="submit" className="auth-submit-btn">
                  {mode === 'register' ? 'Create TRADEMAX Account' : 'Sign In to Terminal'}
                </button>

                <p className="auth-terms-note">
                  By continuing, you agree to TRADEMAX's{' '}
                  <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a> and{' '}
                  <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
