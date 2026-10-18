import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Smartphone,
  Info,
} from 'lucide-react';
import './CourseRegistrationModal.css';

export const CourseRegistrationModal = ({
  isOpen,
  onClose,
  course,
  batchName: propBatchName = 'November',
  user,
  onNavigate,
  onOpenAuth,
}) => {
  const targetCourseTitle = course?.title || 'Basics to Advanced Course';
  const targetCourseSlug = course?.slug || 'trading-masterclass';
  const targetCourseId = course?.id || null;
  const batchName = course?.batch_name || propBatchName;

  // Authoritative price fetched from backend
  const [resolvedCourse, setResolvedCourse] = useState(course || null);
  const [coursePrice, setCoursePrice] = useState(
    course?.price !== undefined ? parseFloat(course.price) : 20000
  );
  const [originalPrice, setOriginalPrice] = useState(
    course?.original_price !== undefined ? parseFloat(course.original_price) : 25000
  );

  // Admin-configured payment settings
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');

  // Flow steps: 'scan_and_pay' | 'submit_evidence' | 'pending_verification' | 'already_enrolled'
  const [currentStep, setCurrentStep] = useState('scan_and_pay');

  // Form State
  const [transactionRef, setTransactionRef] = useState('');
  const [studentNotes, setStudentNotes] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [submittedClaim, setSubmittedClaim] = useState(null);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [isInProcess, setIsInProcess] = useState(false);

  const fileInputRef = useRef(null);

  // 1. Fetch authoritative course details from DB & check enrollment
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const targetSlugOrId = targetCourseId || targetCourseSlug || 'trading-masterclass';
    const token = localStorage.getItem('tm_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`/api/courses/${targetSlugOrId}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.course) {
          setResolvedCourse(data.course);
          setCoursePrice(parseFloat(data.course.price) || 20000);
          setOriginalPrice(parseFloat(data.course.original_price) || 25000);
          if (data.isEnrolled || data.course.is_enrolled) {
            setIsAlreadyEnrolled(true);
            setCurrentStep('already_enrolled');
          } else if (data.isInProcess || data.course.is_in_process) {
            setIsInProcess(true);
            setSubmittedClaim(data.pendingClaim);
            setCurrentStep('in_process');
          }
        }
      })
      .catch((err) => console.warn('Course fetch error:', err));

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetCourseId, targetCourseSlug]);

  // 2. Fetch admin payment configuration
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setConfigLoading(true);
    setConfigError('');

    fetch('/api/payments/manual-config')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success) {
          setPaymentConfig(data);
          if (!data.isConfigured || !data.enabled) {
            setConfigError(
              data.error_message ||
                'Manual payment verification is currently being updated. Please contact TradeMax admissions.'
            );
          }
        } else {
          setConfigError('Unable to load payment configuration.');
        }
      })
      .catch((err) => {
        console.error('Config fetch error:', err);
        if (isMounted) setConfigError('Network error loading payment details.');
      })
      .finally(() => {
        if (isMounted) setConfigLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    if (paymentConfig?.upi_id) {
      navigator.clipboard.writeText(paymentConfig.upi_id);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        screenshot: 'Only JPEG, PNG, and WebP image formats are permitted.',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        screenshot: 'Screenshot image must be under 5MB.',
      }));
      return;
    }

    setScreenshotFile(file);
    setFormErrors((prev) => ({ ...prev, screenshot: null }));
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const validateSubmission = () => {
    const errors = {};
    const cleanRef = transactionRef.trim();

    if (!cleanRef) {
      errors.transactionRef = 'UPI transaction reference / UTR number is required.';
    } else if (cleanRef.length < 8 || cleanRef.length > 35) {
      errors.transactionRef = 'Transaction reference must be between 8 and 35 characters.';
    } else if (!/^[A-Za-z0-9\-_/]+$/.test(cleanRef)) {
      errors.transactionRef = 'Invalid characters in reference number. Only letters, numbers, hyphens, and slashes are allowed.';
    }

    if (!screenshotFile) {
      errors.screenshot = 'Please upload a screenshot of your successful UPI payment.';
    }

    if (!paymentConfirmed) {
      errors.paymentConfirmed = 'You must confirm that you have completed the payment.';
    }

    return errors;
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    setBackendError('');

    // Require student authentication
    const token = localStorage.getItem('tm_token');
    if (!token && !user) {
      setBackendError('Please log in to your TradeMax student account to submit payment verification.');
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    const validationErrors = validateSubmission();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('course_id', targetCourseId || resolvedCourse?.id || 1);
      formData.append('course_slug', targetCourseSlug);
      formData.append('transaction_ref', transactionRef.trim().toUpperCase());
      formData.append('student_notes', studentNotes.trim());
      formData.append('payment_confirmed', 'true');
      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      }

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch('/api/payments/manual-claim', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        if (data.isAlreadyEnrolled) {
          setIsAlreadyEnrolled(true);
          setCurrentStep('already_enrolled');
          return;
        }
        throw new Error(data.error || 'Failed to submit payment claim. Please verify your details.');
      }

      setSubmittedClaim(data.claim);
      setCurrentStep('pending_verification');
      window.dispatchEvent(new CustomEvent('tm:enrollment_updated'));
    } catch (err) {
      console.error('[Manual Claim Error]:', err);
      setBackendError(err.message || 'Payment submission failed. Please contact TradeMax admissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setCurrentStep('scan_and_pay');
    setTransactionRef('');
    setStudentNotes('');
    setPaymentConfirmed(false);
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);
    setFormErrors({});
    setBackendError('');
    setIsAlreadyEnrolled(false);
    onClose();
  };

  const handleGoToPortal = (tab = 'dashboard') => {
    handleResetAndClose();
    if (onNavigate) {
      onNavigate(tab);
    } else {
      window.location.hash = `#${tab}`;
    }
  };

  const qrImageUrl = paymentConfig?.qr_code_url || '/qr.jpg';
  const recipientName = paymentConfig?.recipient_name || 'PATIL TANISHQ DEEPAK';
  const upiId = paymentConfig?.upi_id || '';
  const instructions =
    paymentConfig?.instructions ||
    'Open any supported UPI payment app and scan the QR code above to pay the course fee. After completing your payment, return to TRADEMAX and submit your UPI transaction reference/UTR number along with a screenshot of your successful payment.';

  const handleProceedToEvidence = () => {
    const token = localStorage.getItem('tm_token');
    if (!token && !user) {
      setBackendError('Please log in before submitting payment verification.');
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    setBackendError('');
    setCurrentStep('submit_evidence');
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
        className="tm-course-modal-card tm-clean-modal-layout"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ====================================================================
            SOLID BLUE HEADER (MATCHING SCREENSHOT)
            ==================================================================== */}
        <div className="tm-modal-header-blue">
          <div className="tm-modal-header-text">
            <h2 id="course-modal-title" className="tm-modal-header-title">
              {currentStep === 'already_enrolled' || isAlreadyEnrolled
                ? 'Course Enrollment'
                : currentStep === 'pending_verification' || currentStep === 'in_process' || isInProcess
                ? 'Payment Verification'
                : currentStep === 'submit_evidence'
                ? 'Payment Verification'
                : 'Scan & Pay'}
            </h2>
            <p className="tm-modal-header-subtitle">
              {currentStep === 'already_enrolled' || isAlreadyEnrolled
                ? 'Your admission details for this program'
                : currentStep === 'pending_verification' || currentStep === 'in_process' || isInProcess
                ? 'Your payment proof has been submitted successfully. Your enrollment is pending admin verification.'
                : currentStep === 'submit_evidence'
                ? 'Enter your transaction UTR and upload your payment screenshot'
                : 'Scan the official QR code with any UPI app to pay the course fee.'}
            </p>
          </div>
          <button
            type="button"
            className="tm-modal-header-close"
            onClick={handleResetAndClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* ====================================================================
            MODAL BODY (CLEAN WHITE CARDS MATCHING SCREENSHOT)
            ==================================================================== */}
        <div className="tm-modal-body-scroll">
          {isAlreadyEnrolled || currentStep === 'already_enrolled' ? (
            /* STATE 1: ALREADY ENROLLED */
            <div className="tm-clean-card tm-already-enrolled-card">
              <div className="tm-enrolled-badge">
                <CheckCircle2 size={16} />
                <span>Active Course Enrollment</span>
              </div>
              <h3 className="tm-enrolled-title">{targetCourseTitle}</h3>
              <p className="tm-enrolled-msg">
                Your admission for <strong>{targetCourseTitle} ({batchName} Batch)</strong> is already active in your account. You do not need to make another payment for this course.
              </p>
              <div className="tm-enrolled-support-row">
                <span>Admissions Support:</span>
                <a href="tel:8799026206" className="tm-support-link">8799026206</a>
              </div>
            </div>
          ) : (currentStep === 'pending_verification' || currentStep === 'in_process' || isInProcess) && submittedClaim ? (
            /* STATE 2: PAYMENT CLAIM SUBMITTED (IN PROCESS) */
            <div className="tm-clean-cards-stack">
              <div className="tm-clean-card tm-pending-summary-card">
                <div className="tm-pending-badge">
                  <Clock size={15} />
                  <span>Status: IN PROCESS</span>
                </div>
                <div className="tm-summary-course-name">{targetCourseTitle}</div>
                <div className="tm-summary-course-fee">
                  ₹{Number(submittedClaim.amount || coursePrice).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="tm-clean-card tm-receipt-details-card">
                <div className="tm-receipt-item">
                  <span className="label">Claim ID</span>
                  <code className="val-code">{submittedClaim.claim_id}</code>
                </div>
                <div className="tm-receipt-item">
                  <span className="label">UTR / Transaction Reference</span>
                  <code className="val-code">{submittedClaim.transaction_ref}</code>
                </div>
                <div className="tm-receipt-item">
                  <span className="label">Verification State</span>
                  <span className="val-pending">Awaiting Admin Verification</span>
                </div>
              </div>

              <div className="tm-clean-notice-card">
                <Clock size={16} className="tm-notice-shield" style={{ color: '#D97706' }} />
                <span>
                  Your payment is in process. Your course access will be activated after admin verification.
                </span>
              </div>
            </div>
          ) : (
            /* STATE 3: SCAN & PAY OR SUBMIT EVIDENCE */
            <>
              {backendError && (
                <div className="tm-modal-error-banner" role="alert">
                  <AlertCircle size={15} />
                  <span>{backendError}</span>
                </div>
              )}

              {configError ? (
                <div className="tm-clean-card tm-error-card">
                  <Info size={20} className="text-amber" />
                  <div>
                    <h4>Payment Notice</h4>
                    <p>{configError}</p>
                    <p className="tm-support-contact">
                      Admissions Support: <a href="tel:8799026206">8799026206</a>
                    </p>
                  </div>
                </div>
              ) : configLoading ? (
                <div className="tm-clean-card tm-loading-card">
                  <div className="tm-spinner-clean"></div>
                  <span>Loading official payment details...</span>
                </div>
              ) : currentStep === 'scan_and_pay' ? (
                /* STEP A: SCAN & PAY VIEW */
                <div className="tm-clean-cards-stack">
                  {/* Clean Course & Fee Card */}
                  <div className="tm-clean-card tm-modal-course-card">
                    <div className="tm-course-card-left">
                      <div className="tm-course-title-text">{targetCourseTitle}</div>
                      <div className="tm-course-batch-text">{batchName} Batch</div>
                    </div>
                    <div className="tm-course-price-text">
                      ₹{coursePrice.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Clean QR Code Card */}
                  <div className="tm-clean-card tm-qr-card">
                    <p className="tm-qr-instruction">
                      Scan with any UPI app (GPay, PhonePe, Paytm, BHIM) to pay
                    </p>
                    <div className="tm-qr-img-frame">
                      <img
                        src={qrImageUrl}
                        alt="Official TradeMax UPI Payment QR Code"
                        className="tm-official-qr-img"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          setConfigError('Official payment QR code could not be loaded. Please call admissions.');
                        }}
                      />
                    </div>

                    <div className="tm-upi-info-strip">
                      <div className="tm-upi-meta-row">
                        <span className="label">Recipient:</span>
                        <strong className="val">{recipientName}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* STEP B: SUBMIT EVIDENCE FORM */
                <form id="evidence-form" onSubmit={handleSubmitClaim} className="tm-clean-cards-stack" noValidate>
                  {/* Student profile card */}
                  {user && (
                    <div className="tm-clean-card tm-student-id-card">
                      <span className="label">Student Account:</span>
                      <strong>{user.name || 'TradeMax Student'}</strong>
                      <span className="text-muted">({user.email})</span>
                    </div>
                  )}

                  {/* Transaction Reference / UTR Input Card */}
                  <div className="tm-clean-card">
                    <label className="tm-input-card-label" htmlFor="reg-utr">
                      UPI Transaction Reference / UTR Number <span className="tm-req">*</span>
                    </label>
                    <input
                      id="reg-utr"
                      type="text"
                      value={transactionRef}
                      onChange={(e) => {
                        setTransactionRef(e.target.value.toUpperCase());
                        if (formErrors.transactionRef) {
                          setFormErrors({ ...formErrors, transactionRef: null });
                        }
                      }}
                      placeholder="e.g. 428912345678 (12-digit UTR)"
                      className={`tm-clean-text-input ${formErrors.transactionRef ? 'invalid' : ''}`}
                      disabled={isSubmitting}
                      maxLength={35}
                      autoComplete="off"
                    />
                    {formErrors.transactionRef ? (
                      <span className="tm-input-err">{formErrors.transactionRef}</span>
                    ) : (
                      <span className="tm-input-hint">Found in your UPI payment app transaction details</span>
                    )}
                  </div>

                  {/* Screenshot Upload Card */}
                  <div className="tm-clean-card">
                    <label className="tm-input-card-label">
                      Payment Screenshot <span className="tm-req">*</span>
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                    />

                    {screenshotPreview ? (
                      <div className="tm-screenshot-preview-strip">
                        <img
                          src={screenshotPreview}
                          alt="Screenshot preview"
                          className="tm-ss-thumb"
                        />
                        <div className="tm-ss-details">
                          <span className="tm-ss-filename">{screenshotFile?.name}</span>
                          <span className="tm-ss-filesize">
                            {(screenshotFile?.size / 1024).toFixed(1)} KB
                          </span>
                          <button
                            type="button"
                            className="tm-btn-change-file"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSubmitting}
                          >
                            Change Screenshot
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`tm-clean-dropzone ${formErrors.screenshot ? 'invalid' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                      >
                        <Upload size={22} className="tm-dropzone-icon" />
                        <div className="tm-dropzone-copy">
                          <strong>Click to select payment screenshot</strong>
                          <span>JPEG, PNG, WebP up to 5MB</span>
                        </div>
                      </div>
                    )}
                    {formErrors.screenshot && (
                      <span className="tm-input-err">{formErrors.screenshot}</span>
                    )}
                  </div>

                  {/* Confirmation Checkbox Card */}
                  <div className="tm-clean-card tm-checkbox-card">
                    <label className="tm-clean-checkbox-label">
                      <input
                        type="checkbox"
                        checked={paymentConfirmed}
                        onChange={(e) => {
                          setPaymentConfirmed(e.target.checked);
                          if (formErrors.paymentConfirmed) {
                            setFormErrors({ ...formErrors, paymentConfirmed: null });
                          }
                        }}
                        disabled={isSubmitting}
                      />
                      <span>
                        I confirm that I have completed the payment of{' '}
                        <strong>₹{coursePrice.toLocaleString('en-IN')}</strong> to{' '}
                        <strong>{recipientName}</strong> via UPI.
                      </span>
                    </label>
                    {formErrors.paymentConfirmed && (
                      <span className="tm-input-err">{formErrors.paymentConfirmed}</span>
                    )}
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* ====================================================================
            FOOTER ACTION BAR (MATCHING SCREENSHOT WITH GREEN ACTION BUTTON)
            ==================================================================== */}
        <div className="tm-modal-footer-clean">
          {isAlreadyEnrolled || currentStep === 'already_enrolled' ? (
            <>
              <button
                type="button"
                className="tm-btn-cancel-clean"
                onClick={handleResetAndClose}
              >
                Close
              </button>
              <button
                type="button"
                className="tm-btn-primary-green"
                onClick={() => handleGoToPortal('my-courses')}
              >
                Go to Classroom
              </button>
            </>
          ) : (currentStep === 'pending_verification' || currentStep === 'in_process' || isInProcess) && submittedClaim ? (
            <>
              <button
                type="button"
                className="tm-btn-cancel-clean"
                onClick={handleResetAndClose}
              >
                Close
              </button>
              <button
                type="button"
                className="tm-btn-primary-green"
                onClick={() => handleGoToPortal('my-courses')}
              >
                View in My Courses
              </button>
            </>
          ) : currentStep === 'scan_and_pay' ? (
            <>
              <button
                type="button"
                className="tm-btn-cancel-clean"
                onClick={handleResetAndClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tm-btn-primary-green"
                onClick={handleProceedToEvidence}
                disabled={Boolean(configError) || configLoading}
              >
                <CheckCircle2 size={16} />
                <span>Payment Completed</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="tm-btn-cancel-clean"
                onClick={() => {
                  setBackendError('');
                  setCurrentStep('scan_and_pay');
                }}
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="submit"
                form="evidence-form"
                className="tm-btn-primary-green"
                disabled={isSubmitting}
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Verification'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
