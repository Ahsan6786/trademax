import React from 'react';
import './CourseCard.css';

export const CourseCard = ({ onOpenDetails, onRegister, onEnquire, course, theme }) => {
  const isEnquiryOnly =
    course?.is_enquiry_only ||
    course?.slug === 'villa-trading-experience' ||
    parseFloat(course?.price || 0) === 0;

  const title = course?.title || 'Basics to Advanced Course';
  const subtitle = course?.subtitle || 'Forex & Crypto Trading';
  const description = course?.description || '';
  const thumbnail = course?.thumbnail || '/1-c.jpeg';
  const price = course?.price !== undefined ? parseFloat(course.price) : 20000;
  const originalPrice =
    course?.original_price !== undefined ? parseFloat(course.original_price) : 0;
  const discountLabel = course?.discount_label || '';

  const duration = course?.duration || '30 Days';
  const learningMode = course?.learning_mode || 'Live Online';
  const level = course?.level || 'Basic to Advanced';
  const isPublished = course?.is_published !== undefined ? Boolean(course.is_published) : true;

  const handleCardClick = () => {
    if (onOpenDetails) {
      onOpenDetails(course);
    }
  };

  const handleActionClick = (e) => {
    e.stopPropagation();
    if (!isPublished) return;
    if (isEnquiryOnly) {
      if (onEnquire) onEnquire(course);
      else if (onOpenDetails) onOpenDetails(course);
    } else {
      if (onRegister) onRegister(course);
    }
  };

  const handleDetailsClick = (e) => {
    e.stopPropagation();
    if (onOpenDetails) {
      onOpenDetails(course);
    }
  };

  return (
    <div
      className={`tm-course-card ${isEnquiryOnly ? 'tm-card-villa' : ''} ${theme === 'dark' ? 'tm-card-dark' : ''}`}
      onClick={handleCardClick}
      role="article"
      aria-label={`${title} Course Card`}
    >
      {/* 1. Course Banner Image */}
      <div className="tm-card-poster-wrap">
        <img
          src={thumbnail}
          alt={`${title} — TRADEMAX by Patil Trader`}
          className="tm-card-poster-img"
          loading="lazy"
          onError={(e) => {
            e.target.src = '/1-c.jpeg';
          }}
        />
        {isEnquiryOnly && (
          <div className="tm-card-badge-exclusive">Exclusive Program</div>
        )}
      </div>

      {/* 2. Spacious Solid Card Content Body */}
      <div className="tm-card-body">
        {/* Course Header Info */}
        <div className="tm-card-title-group">
          <h3 className="tm-card-title">{title}</h3>
          {subtitle && <p className="tm-card-subtitle">{subtitle}</p>}
        </div>

        {/* Short Description */}
        {description && (
          <p className="tm-card-desc">{description}</p>
        )}

        {/* Clean Text Specifications: Pure typography, no icons */}
        <div className="tm-card-specs-row" aria-label="Course specifications">
          <div className="tm-spec-pill">
            <span className="tm-spec-label">Duration</span>
            <span className="tm-spec-value">{duration}</span>
          </div>

          <div className="tm-spec-pill">
            <span className="tm-spec-label">Mode</span>
            <span className="tm-spec-value">{learningMode}</span>
          </div>

          <div className="tm-spec-pill">
            <span className="tm-spec-label">Level</span>
            <span className="tm-spec-value">{level}</span>
          </div>
        </div>

        {/* Solid Pricing Bar */}
        <div className="tm-card-pricing-block">
          {isEnquiryOnly ? (
            <div className="tm-card-price-row">
              <span className="tm-card-price-offer tm-price-enquiry">Contact for Pricing</span>
            </div>
          ) : (
            <div className="tm-card-price-row">
              <span className="tm-card-price-offer">₹{price.toLocaleString('en-IN')}</span>
              {originalPrice > price && (
                <span className="tm-card-price-regular">₹{originalPrice.toLocaleString('en-IN')}</span>
              )}
            </div>
          )}
          {discountLabel && (
            <span className="tm-card-saving-pill">{discountLabel}</span>
          )}
        </div>

        {/* Action Buttons: Solid background, text only, no decorative icons */}
        <div className="tm-card-actions">
          {course?.is_enrolled ? (
            <span className="tm-card-badge-enrolled" aria-label="Already Enrolled">
              ENROLLED
            </span>
          ) : (
            <button
              type="button"
              className={`tm-card-btn-register ${isEnquiryOnly ? 'tm-btn-enquire' : ''}`}
              onClick={handleActionClick}
              disabled={!isPublished}
              aria-label={isEnquiryOnly ? `Enquire for ${title}` : `Enroll in ${title}`}
            >
              <span>
                {!isPublished
                  ? 'ADMISSIONS PAUSED'
                  : isEnquiryOnly
                  ? 'Enquire Now'
                  : 'Enroll Now'}
              </span>
            </button>
          )}

          <button
            type="button"
            className="tm-card-btn-details"
            onClick={handleDetailsClick}
            aria-label={`View Details for ${title}`}
          >
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
