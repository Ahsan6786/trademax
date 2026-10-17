import React, { useState, useEffect } from 'react';
import './VillaEnquiryModal.css';

export const VillaEnquiryModal = ({
  isOpen,
  onClose,
  user,
  course,
  theme,
}) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    trading_experience: user?.trading_experience || 'Intermediate',
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Sync profile details if user changes or modal opens
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
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
    if (submitError) {
      setSubmitError('');
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Full name is required';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (!formData.mobile.trim()) {
      errs.mobile = 'Mobile number is required';
    } else if (!/^[0-9+\s-]{8,15}$/.test(formData.mobile.trim())) {
      errs.mobile = 'Please enter a valid mobile number';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
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

      const res = await fetch('/api/courses/enquire', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobile: formData.mobile.trim(),
          trading_experience: formData.trading_experience,
          message: formData.message.trim(),
          course_slug: course?.slug || 'villa-trading-experience',
          course_name: course?.title || 'Villa Trading Experience',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit enquiry. Please try again.');
      }

      setIsSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Could not send enquiry. Please contact 8799026206 directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setErrors({});
    setSubmitError('');
    onClose();
  };

  return (
    <div
      className="tm-vem-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tm-vem-title"
      onClick={handleResetAndClose}
    >
      <div
        className={`tm-vem-card ${theme === 'dark' ? 'tm-vem-dark' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="tm-vem-close-btn"
          onClick={handleResetAndClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        {isSubmitted ? (
          <div className="tm-vem-success">
            <div className="tm-vem-status-pill">Enquiry Received</div>
            <h3 className="tm-vem-success-title">Thank You for Your Interest</h3>
            <p className="tm-vem-success-text">
              Your enquiry for the <strong>Villa Trading Experience</strong> has been recorded. Our executive admissions desk will review your details and contact you with full schedule and availability information.
            </p>

            <div className="tm-vem-contact-box">
              <span className="tm-vem-contact-label">Direct Admissions Desk:</span>
              <a href="tel:8799026206" className="tm-vem-contact-phone">8799026206</a>
            </div>

            <button
              type="button"
              className="tm-vem-btn-done"
              onClick={handleResetAndClose}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="tm-vem-header">
              <div className="tm-vem-eyebrow">TRADEMAX BY PATIL TRADER</div>
              <h2 id="tm-vem-title" className="tm-vem-title">Villa Trading Experience</h2>
              <p className="tm-vem-subtitle">
                An exclusive villa-based trading experience intended for professional and experienced traders. Submit your details to request program schedule and pricing.
              </p>
            </div>

            {submitError && (
              <div className="tm-vem-error" role="alert">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="tm-vem-form" noValidate>
              {/* Full Name */}
              <div className="tm-vem-field">
                <label htmlFor="vem-name">Full Name</label>
                <input
                  id="vem-name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? 'invalid' : ''}
                  disabled={isSubmitting}
                  autoComplete="name"
                />
                {errors.name && <span className="tm-vem-err">{errors.name}</span>}
              </div>

              {/* Mobile and Email */}
              <div className="tm-vem-grid-2">
                <div className="tm-vem-field">
                  <label htmlFor="vem-mobile">Mobile Number</label>
                  <input
                    id="vem-mobile"
                    type="tel"
                    name="mobile"
                    placeholder="10-digit mobile number"
                    value={formData.mobile}
                    onChange={handleChange}
                    className={errors.mobile ? 'invalid' : ''}
                    disabled={isSubmitting}
                    autoComplete="tel"
                  />
                  {errors.mobile && <span className="tm-vem-err">{errors.mobile}</span>}
                </div>

                <div className="tm-vem-field">
                  <label htmlFor="vem-email">Email Address</label>
                  <input
                    id="vem-email"
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'invalid' : ''}
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                  {errors.email && <span className="tm-vem-err">{errors.email}</span>}
                </div>
              </div>

              {/* Trading Experience */}
              <div className="tm-vem-field">
                <label htmlFor="vem-experience">Trading Experience Level</label>
                <select
                  id="vem-experience"
                  name="trading_experience"
                  value={formData.trading_experience}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="Beginner">Beginner (1-6 months)</option>
                  <option value="Intermediate">Intermediate (1-2 years)</option>
                  <option value="Advanced">Advanced (3+ years)</option>
                  <option value="Professional">Professional (Full-time / Prop Firm)</option>
                </select>
              </div>

              {/* Message */}
              <div className="tm-vem-field">
                <label htmlFor="vem-message">Enquiry Message</label>
                <textarea
                  id="vem-message"
                  name="message"
                  rows="3"
                  placeholder="Specify your trading background, questions regarding schedule, group size, or availability..."
                  value={formData.message}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit CTA */}
              <div className="tm-vem-actions">
                <button
                  type="submit"
                  className="tm-vem-btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting Enquiry...' : 'Submit Enquiry'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default VillaEnquiryModal;
