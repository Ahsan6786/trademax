import React, { useEffect } from 'react';
import './CourseDetailsModal.css';

export const CourseDetailsModal = ({
  isOpen,
  onClose,
  course,
  onRegister,
  onEnquire,
  theme,
}) => {
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

  if (!isOpen || !course) return null;

  const isEnquiryOnly =
    course.is_enquiry_only ||
    course.slug === 'villa-trading-experience' ||
    parseFloat(course.price || 0) === 0;

  const title = course.title || 'Course Details';
  const subtitle = course.subtitle || '';
  const description = course.description || '';
  const duration = course.duration || '';
  const learningMode = course.learning_mode || 'Live Online';
  const level = course.level || 'All Levels';
  const price = course.price !== undefined ? parseFloat(course.price) : 0;
  const originalPrice = course.original_price !== undefined ? parseFloat(course.original_price) : 0;

  // Normalize topics / syllabus
  let topicsList = [];
  if (Array.isArray(course.topics)) {
    topicsList = course.topics;
  } else if (typeof course.topics === 'string') {
    try {
      const parsed = JSON.parse(course.topics);
      if (Array.isArray(parsed)) topicsList = parsed;
      else topicsList = [course.topics];
    } catch {
      topicsList = course.topics.split(',').map((t) => t.trim());
    }
  }

  const learningOutcome = course.learning_outcomes || '';

  const handleAction = () => {
    onClose();
    if (isEnquiryOnly) {
      if (onEnquire) onEnquire(course);
    } else {
      if (onRegister) onRegister(course);
    }
  };

  return (
    <div
      className="tm-cdm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tm-cdm-title"
      onClick={onClose}
    >
      <div
        className={`tm-cdm-card ${theme === 'dark' ? 'tm-cdm-dark' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="tm-cdm-header">
          <div className="tm-cdm-eyebrow">TRADEMAX BY PATIL TRADER</div>
          <button
            type="button"
            className="tm-cdm-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
          <h2 id="tm-cdm-title" className="tm-cdm-title">{title}</h2>
          {subtitle && <p className="tm-cdm-subtitle">{subtitle}</p>}

          {/* Quick Specifications */}
          <div className="tm-cdm-specs-row">
            <div className="tm-cdm-spec-item">
              <span className="tm-cdm-spec-label">Duration:</span>
              <span className="tm-cdm-spec-value">{duration}</span>
            </div>
            <div className="tm-cdm-spec-item">
              <span className="tm-cdm-spec-label">Format:</span>
              <span className="tm-cdm-spec-value">{learningMode}</span>
            </div>
            <div className="tm-cdm-spec-item">
              <span className="tm-cdm-spec-label">Level:</span>
              <span className="tm-cdm-spec-value">{level}</span>
            </div>
            <div className="tm-cdm-spec-item">
              <span className="tm-cdm-spec-label">Pricing:</span>
              <span className="tm-cdm-spec-value">
                {isEnquiryOnly ? 'Contact for Pricing' : `₹${price.toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="tm-cdm-body">
          {/* Description */}
          {description && (
            <div className="tm-cdm-section">
              <h3 className="tm-cdm-section-heading">Program Overview</h3>
              <p className="tm-cdm-text">{description}</p>
            </div>
          )}

          {/* Syllabus / Topics Covered */}
          {topicsList.length > 0 && (
            <div className="tm-cdm-section">
              <h3 className="tm-cdm-section-heading">
                {isEnquiryOnly ? 'Information Covered' : 'Comprehensive Syllabus & Topics'}
              </h3>
              <div className="tm-cdm-topics-grid">
                {topicsList.map((topic, idx) => (
                  <div key={idx} className="tm-cdm-topic-item">
                    <span className="tm-cdm-topic-bullet">•</span>
                    <span className="tm-cdm-topic-text">{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Outcomes */}
          {learningOutcome && (
            <div className="tm-cdm-section tm-cdm-outcome-box">
              <h3 className="tm-cdm-section-heading">Learning Outcome</h3>
              <p className="tm-cdm-text tm-cdm-outcome-text">{learningOutcome}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="tm-cdm-footer">
          <div className="tm-cdm-footer-price">
            <span className="tm-cdm-footer-label">Course Fee:</span>
            <span className="tm-cdm-footer-amount">
              {isEnquiryOnly ? 'Contact for Pricing' : `₹${price.toLocaleString('en-IN')}`}
            </span>
          </div>

          <div className="tm-cdm-footer-buttons">
            <button
              type="button"
              className="tm-cdm-btn-cancel"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className={`tm-cdm-btn-primary ${isEnquiryOnly ? 'tm-cdm-btn-enquire' : ''}`}
              onClick={handleAction}
            >
              {isEnquiryOnly ? 'Enquire Now' : 'Enroll Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsModal;
