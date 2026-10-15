import React, { useState, useEffect } from 'react';
import { CheckCircle2, UserCheck, AlertCircle, Phone, Mail, User } from 'lucide-react';
import './CourseRegistrationModal.css';

export const CourseRegistrationModal = ({
  isOpen,
  onClose,
  batchName = 'November',
  user,
}) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    email: user?.email || '',
    trading_experience: user?.trading_experience || 'Intermediate',
    interest: 'Both',
    reference: 'Website',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [enrollmentDetails, setEnrollmentDetails] = useState(null);

  // Sync user profile when user prop changes or modal opens
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        mobile: user.mobile || prev.mobile,
        trading_experience: user.trading_experience || prev.trading_experience,
      }));
    }
  }, [user]);

  // Check if current user/email is already enrolled
  useEffect(() => {
    if (!isOpen) return;

    const checkEmail = user?.email || formData.email;
    if (!checkEmail) return;

    const token = localStorage.getItem('tm_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`/api/courses/check-enrollment?course_slug=trading-masterclass&email=${encodeURIComponent(checkEmail)}`, {
      headers,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.isEnrolled) {
          setIsAlreadyEnrolled(true);
          setEnrollmentDetails(data.enrollment);
        } else {
          setIsAlreadyEnrolled(false);
        }
      })
      .catch((err) => console.warn('Could not verify enrollment status:', err));
  }, [isOpen, user?.email]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
    if (backendError) {
      setBackendError('');
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[0-9+\s-]{8,15}$/.test(formData.mobile.trim())) {
      newErrors.mobile = 'Please enter a valid mobile number';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendError('');
    const formErrors = validate();

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('tm_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          course_slug: 'trading-masterclass',
          course_name: 'Trading Masterclass (Forex & Crypto Trading)',
          batch_name: batchName,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        if (data.isDuplicate) {
          setIsAlreadyEnrolled(true);
          return;
        }
        throw new Error(data.error || 'Failed to submit registration. Please try again.');
      }

      setIsSuccess(true);
    } catch (err) {
      setBackendError(err.message || 'Could not complete registration. Please call 8799026206 directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setIsAlreadyEnrolled(false);
    setErrors({});
    setBackendError('');
    onClose();
  };

  const isProfileComplete = Boolean(user && user.name && user.email && user.mobile);

  return (
    <div
      className="tm-course-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-modal-title"
      onClick={handleResetAndClose}
    >
      <div
        className="tm-course-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          className="tm-course-modal-close"
          onClick={handleResetAndClose}
          aria-label="Close registration form"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* State A: Already Enrolled */}
        {isAlreadyEnrolled ? (
          <div className="tm-reg-success-view">
            <div className="tm-reg-success-badge already">
              <CheckCircle2 size={16} />
              <span>Seat Reserved</span>
            </div>
            <h3 className="tm-reg-success-title">
              You are Already Enrolled!
            </h3>
            <p className="tm-reg-success-msg">
              Your admission for <strong>Trading Masterclass ({batchName} Batch)</strong> is confirmed. Our institutional admissions desk has reserved your seat.
            </p>
            <div className="tm-reg-success-contact-box">
              <span>Direct Admissions Hotline:</span>
              <a href="tel:8799026206" className="tm-reg-support-phone">
                8799026206
              </a>
            </div>
            <button
              type="button"
              className="tm-reg-btn-done"
              onClick={handleResetAndClose}
            >
              Close
            </button>
          </div>
        ) : isSuccess ? (
          /* State B: Registration Just Confirmed */
          <div className="tm-reg-success-view">
            <div className="tm-reg-success-badge">
              <span className="tm-reg-success-dot"></span>
              <span>Enrollment Confirmed</span>
            </div>
            <h3 className="tm-reg-success-title">
              Enrollment Confirmed
            </h3>
            <p className="tm-reg-success-msg">
              Welcome to TRADEMAX! Your registration for <strong>Trading Masterclass ({batchName} Batch)</strong> has been recorded. Our team will contact you with batch onboarding details.
            </p>
            <div className="tm-reg-success-contact-box">
              <span>Need immediate assistance? Call admission support directly:</span>
              <a href="tel:8799026206" className="tm-reg-support-phone">
                8799026206
              </a>
            </div>
            <button
              type="button"
              className="tm-reg-btn-done"
              onClick={handleResetAndClose}
            >
              Done
            </button>
          </div>
        ) : (
          /* State C: Enrollment Form */
          <>
            <div className="tm-course-modal-header">
              <div className="tm-modal-eyebrow">
                TRADEMAX BY PATIL TRADER · {batchName.toUpperCase()} BATCH
              </div>
              <h2 id="course-modal-title" className="tm-course-modal-title">
                Enroll in Trading Masterclass
              </h2>
              <p className="tm-course-modal-sub">
                Forex &amp; Crypto Institutional Trading. Reserved seats allocated on a first-come basis.
              </p>
            </div>

            {/* Smart Pre-filled User Profile Banner */}
            {user ? (
              <div className="tm-smart-user-banner">
                <div className="tm-smart-user-icon">
                  <UserCheck size={18} />
                </div>
                <div className="tm-smart-user-text">
                  <span className="tm-smart-user-title">Logged in as {user.name}</span>
                  <span className="tm-smart-user-desc">
                    {user.email} {user.mobile ? `· 📞 ${user.mobile}` : ''}
                  </span>
                </div>
              </div>
            ) : null}

            {backendError && (
              <div className="tm-course-modal-error" role="alert">
                <AlertCircle size={16} />
                <span>{backendError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="tm-course-modal-form" noValidate>
              {/* Full Name */}
              <div className="tm-cm-field">
                <label htmlFor="reg-name">FULL NAME *</label>
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  placeholder="e.g. Alex Henderson"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? 'invalid' : ''}
                  disabled={isSubmitting || Boolean(user?.name)}
                  autoComplete="name"
                />
                {errors.name && <span className="tm-cm-err">{errors.name}</span>}
              </div>

              {/* Mobile Number & Email Address Grid */}
              <div className="tm-cm-grid-2">
                <div className="tm-cm-field">
                  <label htmlFor="reg-mobile">MOBILE NUMBER *</label>
                  <input
                    id="reg-mobile"
                    type="tel"
                    name="mobile"
                    placeholder="e.g. 9876543210"
                    value={formData.mobile}
                    onChange={handleChange}
                    className={errors.mobile ? 'invalid' : ''}
                    disabled={isSubmitting || Boolean(user?.mobile)}
                    autoComplete="tel"
                  />
                  {errors.mobile && <span className="tm-cm-err">{errors.mobile}</span>}
                </div>

                <div className="tm-cm-field">
                  <label htmlFor="reg-email">EMAIL ADDRESS *</label>
                  <input
                    id="reg-email"
                    type="email"
                    name="email"
                    placeholder="e.g. alex@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'invalid' : ''}
                    disabled={isSubmitting || Boolean(user?.email)}
                    autoComplete="email"
                  />
                  {errors.email && <span className="tm-cm-err">{errors.email}</span>}
                </div>
              </div>

              {/* Trading Experience Level */}
              <div className="tm-cm-field">
                <label htmlFor="reg-experience">CURRENT TRADING EXPERIENCE</label>
                <select
                  id="reg-experience"
                  name="trading_experience"
                  value={formData.trading_experience}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="Beginner">Beginner (New to financial markets)</option>
                  <option value="Intermediate">Intermediate (1-2 years experience)</option>
                  <option value="Advanced">Advanced (Consistent profitable trader)</option>
                  <option value="Professional">Professional (Institutional / Prop desk)</option>
                </select>
              </div>

              {/* Primary Market Interest */}
              <div className="tm-cm-field">
                <label htmlFor="reg-interest">PRIMARY TRADING FOCUS</label>
                <select
                  id="reg-interest"
                  name="interest"
                  value={formData.interest}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="Both">Both Forex & Crypto (Recommended)</option>
                  <option value="Forex">Forex Markets Only</option>
                  <option value="Crypto">Crypto Markets Only</option>
                </select>
              </div>

              {/* Fee Notice */}
              <div className="tm-cm-fee-strip">
                <span className="tm-cm-fee-label">One-Time Program Fee</span>
                <div className="tm-cm-fee-prices">
                  <span className="tm-cm-fee-strike">₹24,999</span>
                  <span className="tm-cm-fee-bold">₹19,999</span>
                  <span className="tm-cm-fee-save">Save ₹5,000</span>
                </div>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                className="tm-course-modal-submit tm-cm-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="tm-cm-loading-dots">
                    Processing Enrollment<span>.</span><span>.</span><span>.</span>
                  </span>
                ) : user && isProfileComplete ? (
                  'Confirm & Enroll Now'
                ) : (
                  'Enroll Now'
                )}
              </button>

              <div className="tm-course-modal-guarantee">
                🔒 Institutional security &middot; 100% verified curriculum &middot; Limited cohort seats
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
