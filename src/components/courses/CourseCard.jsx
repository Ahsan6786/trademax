import React from 'react';
import {
  Clock,
  Video,
  TrendingUp,
  Calendar,
  ArrowRight,
  Flame,
} from 'lucide-react';
import './CourseCard.css';

export const CourseCard = ({ onOpenDetails, onRegister, course, settings, theme }) => {
  const title = course?.title || 'Trading Masterclass';
  const rawSubtitle = course?.subtitle || 'Forex & Crypto Trading';
  // Remove "Basic to Advanced" from subtitle
  const subtitle = rawSubtitle
    .replace(/\s*[—–-]\s*Basic to Advanced/gi, '')
    .replace(/Basic to Advanced/gi, '')
    .trim();

  const description =
    course?.description ||
    'Structured 1-month online program covering market structure, technical analysis, trading psychology, and disciplined risk management.';
  const thumbnail = course?.thumbnail || '/1-c.jpeg';
  const price = course?.price !== undefined ? parseFloat(course.price) : 19999;
  const originalPrice =
    course?.original_price !== undefined ? parseFloat(course.original_price) : 24999;
  const discountLabel =
    course?.discount_label ||
    (originalPrice > price
      ? `Save ₹${(originalPrice - price).toLocaleString('en-IN')}`
      : 'Special Batch Offer');
  const duration = course?.duration || '1 Month';
  const learningMode = course?.learning_mode || 'Live Online';
  const batchName = course?.batch_name || settings?.batchName || 'November';
  const seatsAvailable =
    course?.seats_available !== undefined ? course.seats_available : settings?.seatsAvailable;
  const showSeatCount = settings?.showSeatCount;
  const isPublished = course?.is_published !== undefined ? Boolean(course.is_published) : true;

  const announcementText = !isPublished
    ? 'Admissions Temporarily Closed'
    : settings?.announcementText || `${batchName} Batch — Limited Seats Available`;

  const handleCardClick = () => {
    if (onOpenDetails) {
      onOpenDetails();
    }
  };

  const handleRegisterClick = (e) => {
    e.stopPropagation();
    if (!isPublished) return;
    if (onRegister) {
      onRegister();
    }
  };

  const handleDetailsClick = (e) => {
    e.stopPropagation();
    if (onOpenDetails) {
      onOpenDetails();
    }
  };

  return (
    <div
      className={`tm-course-card ${theme === 'dark' ? 'tm-card-dark' : ''}`}
      onClick={handleCardClick}
      role="article"
      aria-label={`${title} Course Card`}
    >
      {/* 1. Clean Media Frame (No Black Overlays, Crisp Vibrant Image) */}
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

        {/* Floating Solid Discount Badge pinned cleanly on corner */}
        {discountLabel && (
          <div className="tm-card-media-badges">
            <span className="tm-card-discount-badge">
              {discountLabel}
            </span>
          </div>
        )}
      </div>

      {/* 2. Spacious Solid Card Content Body */}
      <div className="tm-card-body">
        {/* Solid Announcement Status Row */}
        <div className="tm-card-status-bar">
          <div className="tm-card-badge-batch">
            <span
              className="tm-card-pulse-dot"
              style={{ backgroundColor: isPublished ? '#22C55E' : '#EF4444' }}
              aria-hidden="true"
            ></span>
            <span className="tm-card-batch-text">{announcementText}</span>
          </div>
          {isPublished && showSeatCount && seatsAvailable !== undefined && (
            <div className="tm-card-seats-pill">
              <Flame size={11} className="tm-seats-icon" aria-hidden="true" />
              <span>{seatsAvailable} seats left</span>
            </div>
          )}
        </div>

        {/* Course Header Info */}
        <div className="tm-card-title-group">
          <div className="tm-card-title-row">
            <div>
              <span className="tm-card-eyebrow">TRADEMAX BY PATIL TRADER</span>
              <h3 className="tm-card-title">{title}</h3>
            </div>
            <span className="tm-card-curriculum-tag">{learningMode}</span>
          </div>
          {subtitle && (
            <div className="tm-card-subtitle">
              {subtitle}
            </div>
          )}
        </div>

        {/* Short Summary Description */}
        <p className="tm-card-desc">
          {description}
        </p>

        {/* Compact Key Features Grid with Lucide Icons */}
        <div className="tm-card-specs-grid" aria-label="Course specifications">
          <div className="tm-spec-item">
            <Clock size={13} className="tm-spec-icon" aria-hidden="true" />
            <span className="tm-spec-value">{duration}</span>
          </div>

          <div className="tm-spec-item">
            <Video size={13} className="tm-spec-icon" aria-hidden="true" />
            <span className="tm-spec-value">{learningMode}</span>
          </div>

          <div className="tm-spec-item">
            <TrendingUp size={13} className="tm-spec-icon" aria-hidden="true" />
            <span className="tm-spec-value">Forex &amp; Crypto</span>
          </div>

          <div className="tm-spec-item">
            <Calendar size={13} className="tm-spec-icon" aria-hidden="true" />
            <span className="tm-spec-value">{batchName} Batch</span>
          </div>
        </div>

        {/* Compact Pricing Bar */}
        <div className="tm-card-pricing-block">
          <div className="tm-card-price-row">
            <span className="tm-card-price-offer">₹{price.toLocaleString('en-IN')}</span>
            {originalPrice > price && (
              <span className="tm-card-price-regular">₹{originalPrice.toLocaleString('en-IN')}</span>
            )}
          </div>
          {discountLabel && <span className="tm-card-saving-pill">{discountLabel}</span>}
        </div>

        {/* Side-by-Side Action Buttons */}
        <div className="tm-card-actions">
          <button
            type="button"
            className="tm-card-btn-register"
            onClick={handleRegisterClick}
            disabled={!isPublished}
            style={!isPublished ? { opacity: 0.6, cursor: 'not-allowed', background: '#475569' } : {}}
            aria-label={`Register for ${title}`}
          >
            <span>{isPublished ? 'REGISTER FOR COURSE' : 'ADMISSIONS PAUSED'}</span>
          </button>

          <button
            type="button"
            className="tm-card-btn-details"
            onClick={handleDetailsClick}
            aria-label="View Course Details"
          >
            <span>View Details</span>
            <ArrowRight size={14} className="tm-arrow-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
