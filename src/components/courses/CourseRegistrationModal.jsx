import React, { useState, useEffect } from 'react';
import { loadRazorpay } from '../../utils/loadRazorpay';
import './CourseRegistrationModal.css';

export const CourseRegistrationModal = ({
  isOpen,
  onClose,
  batchName = 'November',
  user,
  onNavigate,
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
  const [paymentStep, setPaymentStep] = useState('idle'); // 'idle' | 'creating_order' | 'checkout_active' | 'verifying'
  const [backendError, setBackendError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [enrollmentDetails, setEnrollmentDetails] = useState(null);
  const [completedPayment, setCompletedPayment] = useState(null);

  // Sync user profile when user prop changes or modal opens (prefill without green banner)
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
    setPaymentStep('creating_order');

    try {
      // 1. Ensure Razorpay SDK is loaded
      const isSdkLoaded = await loadRazorpay();
      if (!isSdkLoaded) {
        throw new Error('Razorpay payment gateway SDK failed to load. Please check your internet connection.');
      }

      const token = localStorage.getItem('tm_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // 2. Request backend to create Razorpay Order securely
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          course_slug: 'trading-masterclass',
          course_name: 'Trading Masterclass (Forex & Crypto Trading)',
          batch_name: batchName,
        }),
      });

      const orderData = await orderRes.json().catch(() => ({}));

      if (!orderRes.ok || !orderData.success) {
        if (orderData.isDuplicate) {
          setIsAlreadyEnrolled(true);
          return;
        }
        throw new Error(orderData.error || 'Failed to initialize payment order. Please try again.');
      }

      // If course is free or requires no payment
      if (orderData.requires_payment === false) {
        setIsSuccess(true);
        return;
      }

      const { order, key_id, currency } = orderData;
      setPaymentStep('checkout_active');

      // 3. Launch Razorpay Checkout Modal
      const options = {
        key: key_id || 'rzp_test_Toeh6O3nccqAo0',
        amount: order.amount,
        currency: currency || 'INR',
        name: 'TRADEMAX',
        description: `Admission: Trading Masterclass (${batchName} Batch)`,
        image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        order_id: order.id,
        prefill: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          contact: formData.mobile.trim(),
        },
        notes: {
          course_slug: 'trading-masterclass',
          batch_name: batchName,
          test_mode: 'true',
        },
        theme: {
          color: '#DC2626',
        },
        handler: async function (response) {
          // 4. Cryptographic Server-Side Signature Verification
          setPaymentStep('verifying');
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile,
                trading_experience: formData.trading_experience,
                interest: formData.interest,
                reference: formData.reference,
                batch_name: batchName,
                course_slug: 'trading-masterclass',
              }),
            });

            const verifyData = await verifyRes.json().catch(() => ({}));

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment signature verification failed. Please contact admissions.');
            }

            setCompletedPayment({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              amount: (order.amount / 100).toLocaleString('en-IN'),
              date: new Date().toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            });

            setIsSuccess(true);
            setPaymentStep('idle');
            window.dispatchEvent(new CustomEvent('tm:enrollment_updated'));
          } catch (verifyErr) {
            console.error('[Payment Verification Error]:', verifyErr);
            setBackendError(verifyErr.message || 'Payment signature could not be verified.');
            setPaymentStep('idle');
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            setPaymentStep('idle');
            fetch('/api/payments/failed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: order.id,
                reason: 'USER_CANCELLED',
                description: 'User dismissed the Razorpay checkout modal before completing transaction.',
              }),
            }).catch(() => {});
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on('payment.failed', function (failedResponse) {
        setIsSubmitting(false);
        setPaymentStep('idle');
        const errReason = failedResponse.error?.description || failedResponse.error?.reason || 'Payment declined or cancelled.';
        setBackendError(`Payment Failed: ${errReason}`);

        fetch('/api/payments/failed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.id,
            payment_id: failedResponse.error?.metadata?.payment_id,
            code: failedResponse.error?.code,
            reason: failedResponse.error?.reason,
            description: failedResponse.error?.description,
          }),
        }).catch(() => {});
      });

      razorpayInstance.open();
    } catch (err) {
      console.error('[Registration/Payment Error]:', err);
      setBackendError(err.message || 'Could not complete registration. Please call 8799026206 directly.');
      setIsSubmitting(false);
      setPaymentStep('idle');
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setIsAlreadyEnrolled(false);
    setErrors({});
    setBackendError('');
    onClose();
  };

  const handleNavigateToPortal = () => {
    handleResetAndClose();
    if (onNavigate) {
      onNavigate('dashboard');
    } else {
      window.location.hash = '#dashboard';
    }
  };

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
        {/* Simple Unobtrusive Close Button */}
        <button
          type="button"
          className="tm-course-modal-close"
          onClick={handleResetAndClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* State A: Already Enrolled */}
        {isAlreadyEnrolled ? (
          <div className="tm-reg-success-view">
            <div className="tm-reg-status-pill">Seat Reserved</div>
            <h3 className="tm-reg-success-title">Already Enrolled</h3>
            <p className="tm-reg-success-msg">
              Your admission for <strong>Trading Masterclass ({batchName} Batch)</strong> is already confirmed.
            </p>
            <div className="tm-reg-hotline-box">
              <span>Direct Admissions Hotline:</span>
              <a href="tel:8799026206" className="tm-reg-support-phone">8799026206</a>
            </div>
            <div className="tm-reg-actions-row">
              <button
                type="button"
                className="tm-reg-btn-primary"
                onClick={handleNavigateToPortal}
              >
                Go to Student Portal
              </button>
              <button
                type="button"
                className="tm-reg-btn-secondary"
                onClick={handleResetAndClose}
              >
                Close
              </button>
            </div>
          </div>
        ) : isSuccess ? (
          /* State B: Registration & Payment Confirmed */
          <div className="tm-reg-success-view">
            <div className="tm-reg-status-pill success">Payment Verified &middot; Access Granted</div>
            <h3 className="tm-reg-success-title">Enrollment Confirmed</h3>
            <p className="tm-reg-success-msg">
              Your payment has been verified on our secure server. Welcome to the <strong>Trading Masterclass ({batchName} Batch)</strong>.
            </p>

            {completedPayment && (
              <div className="tm-payment-receipt-box">
                <div className="tm-receipt-header">PAYMENT RECEIPT (TEST MODE)</div>
                <div className="tm-receipt-grid">
                  <div className="tm-receipt-row">
                    <span className="tm-receipt-key">Transaction ID</span>
                    <span className="tm-receipt-val tm-receipt-mono">{completedPayment.paymentId}</span>
                  </div>
                  <div className="tm-receipt-row">
                    <span className="tm-receipt-key">Order ID</span>
                    <span className="tm-receipt-val tm-receipt-mono">{completedPayment.orderId}</span>
                  </div>
                  <div className="tm-receipt-row">
                    <span className="tm-receipt-key">Amount Paid</span>
                    <span className="tm-receipt-val tm-receipt-price">₹{completedPayment.amount}</span>
                  </div>
                  <div className="tm-receipt-row">
                    <span className="tm-receipt-key">Status</span>
                    <span className="tm-receipt-val tm-receipt-verified">Captured &middot; SHA-256 Verified</span>
                  </div>
                  <div className="tm-receipt-row">
                    <span className="tm-receipt-key">Timestamp</span>
                    <span className="tm-receipt-val">{completedPayment.date}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="tm-reg-hotline-box">
              <span>Admissions support hotline:</span>
              <a href="tel:8799026206" className="tm-reg-support-phone">8799026206</a>
            </div>

            <div className="tm-reg-actions-row">
              <button
                type="button"
                className="tm-reg-btn-primary"
                onClick={handleNavigateToPortal}
              >
                Access Student Portal
              </button>
              <button
                type="button"
                className="tm-reg-btn-secondary"
                onClick={handleResetAndClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* State C: Clean Minimal Enrollment Form */
          <>
            <div className="tm-course-modal-header">
              <div className="tm-modal-eyebrow">
                TRADEMAX &middot; {batchName.toUpperCase()} BATCH ADMISSIONS
              </div>
              <h2 id="course-modal-title" className="tm-course-modal-title">
                Enroll in Trading Masterclass
              </h2>
              <p className="tm-course-modal-sub">
                Forex &amp; Crypto Institutional Trading. Cohort seats reserved upon confirmed payment.
              </p>
            </div>

            {backendError && (
              <div className="tm-course-modal-error" role="alert">
                {backendError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="tm-course-modal-form" noValidate>
              {/* Full Name */}
              <div className="tm-cm-field">
                <label htmlFor="reg-name">Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? 'invalid' : ''}
                  disabled={isSubmitting}
                  autoComplete="name"
                />
                {errors.name && <span className="tm-cm-err">{errors.name}</span>}
              </div>

              {/* Mobile Number & Email Address 2-column Grid */}
              <div className="tm-cm-grid-2">
                <div className="tm-cm-field">
                  <label htmlFor="reg-mobile">Mobile Number</label>
                  <input
                    id="reg-mobile"
                    type="tel"
                    name="mobile"
                    placeholder="10-digit mobile number"
                    value={formData.mobile}
                    onChange={handleChange}
                    className={errors.mobile ? 'invalid' : ''}
                    disabled={isSubmitting}
                    autoComplete="tel"
                  />
                  {errors.mobile && <span className="tm-cm-err">{errors.mobile}</span>}
                </div>

                <div className="tm-cm-field">
                  <label htmlFor="reg-email">Email Address</label>
                  <input
                    id="reg-email"
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'invalid' : ''}
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                  {errors.email && <span className="tm-cm-err">{errors.email}</span>}
                </div>
              </div>

              {/* Trading Experience Level */}
              <div className="tm-cm-field">
                <label htmlFor="reg-experience">Trading Experience Level</label>
                <select
                  id="reg-experience"
                  name="trading_experience"
                  value={formData.trading_experience}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="Beginner">Beginner (New to financial markets)</option>
                  <option value="Intermediate">Intermediate (1-2 years trading)</option>
                  <option value="Advanced">Advanced (Consistent profitable trader)</option>
                  <option value="Professional">Professional (Prop firm / Institutional)</option>
                </select>
              </div>

              {/* Primary Market Focus */}
              <div className="tm-cm-field">
                <label htmlFor="reg-interest">Primary Trading Focus</label>
                <select
                  id="reg-interest"
                  name="interest"
                  value={formData.interest}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="Both">Both Forex &amp; Crypto (Recommended)</option>
                  <option value="Forex">Forex Markets Only</option>
                  <option value="Crypto">Crypto Markets Only</option>
                </select>
              </div>

              {/* Pricing Section */}
              <div className="tm-cm-fee-strip">
                <div className="tm-cm-fee-info">
                  <span className="tm-cm-fee-label">Total Program Fee</span>
                  <span className="tm-cm-test-mode-tag">Razorpay Test Mode</span>
                </div>
                <div className="tm-cm-fee-prices">
                  <span className="tm-cm-fee-strike">₹24,999</span>
                  <span className="tm-cm-fee-bold">₹19,999</span>
                  <span className="tm-cm-fee-save">Save ₹5,000</span>
                </div>
              </div>

              {/* Red Payment Button */}
              <button
                type="submit"
                className="tm-course-modal-submit"
                disabled={isSubmitting}
              >
                {paymentStep === 'creating_order' ? (
                  'Creating Razorpay Order...'
                ) : paymentStep === 'checkout_active' ? (
                  'Complete in Razorpay Window...'
                ) : paymentStep === 'verifying' ? (
                  'Verifying Payment Signature...'
                ) : isSubmitting ? (
                  'Processing Enrollment...'
                ) : (
                  'Proceed to Pay ₹19,999 (Test Mode)'
                )}
              </button>

              <div className="tm-course-modal-guarantee">
                Razorpay 256-bit encrypted checkout &middot; Test Mode only
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
