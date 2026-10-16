import React from 'react';
import {
  Clock,
  Video,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import './CourseCard.css';

export const CourseCard = ({ onOpenDetails, onRegister, course, settings, theme }) => {
  const title = course?.title || 'Trading Masterclass';
  const subtitle = course?.subtitle || 'Forex & Crypto Trading';
  const thumbnail = course?.thumbnail || '/1-c.jpeg';
  const price = course?.price !== undefined ? parseFloat(course.price) : 19999;
  const originalPrice =
    course?.original_price !== undefined ? parseFloat(course.original_price) : 24999;

  const savings = originalPrice > price ? originalPrice - price : 5000;
  const percentOff = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 20;
  const discountBadge = `Save ₹${savings.toLocaleString('en-IN')} (${percentOff}% OFF)`;

  const duration = course?.duration || '1 Month';
  const learningMode = course?.learning_mode || 'Live Online';
  const isPublished = course?.is_published !== undefined ? Boolean(course.is_published) : true;

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
      {/* 1. Course Banner Image (Full width, crisp, natural aspect ratio) */}
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
      </div>

      {/* 2. Spacious Solid Card Content Body */}
      <div className="tm-card-body">
        {/* Course Header Info */}
        <div className="tm-card-title-group">
          <span className="tm-card-eyebrow">TRADEMAX BY PATIL TRADER</span>
          <h3 className="tm-card-title">{title}</h3>
          <p className="tm-card-subtitle">{subtitle}</p>
        </div>

        {/* Compact Key Specifications: 1 Month · Live Online · Forex & Crypto */}
        <div className="tm-card-specs-row" aria-label="Course specifications">
          <div className="tm-spec-pill">
            <Clock size={13} className="tm-spec-icon" aria-hidden="true" />
            <span className="tm-spec-value">{duration}</span>
          </div>

          <div className="tm-spec-pill">
            <Video size={13} className="tm-spec-icon" aria-hidden="true" />
            <span className="tm-spec-value">{learningMode}</span>
          </div>

          <div className="tm-spec-pill">
            <TrendingUp size={13} className="tm-spec-icon" aria-hidden="true" />
            <span className="tm-spec-value">Forex &amp; Crypto</span>
          </div>
        </div>

        {/* Compact Pricing Bar with Single "Save ₹5,000 (20% OFF)" Badge */}
        <div className="tm-card-pricing-block">
          <div className="tm-card-price-row">
            <span className="tm-card-price-offer">₹{price.toLocaleString('en-IN')}</span>
            {originalPrice > price && (
              <span className="tm-card-price-regular">₹{originalPrice.toLocaleString('en-IN')}</span>
            )}
          </div>
          <span className="tm-card-saving-pill">{discountBadge}</span>
        </div>

        {/* Side-by-Side Action Buttons: REGISTER FOR COURSE & View Details */}
        <div className="tm-card-actions">
          <button
            type="button"
            className="tm-card-btn-register"
            onClick={handleRegisterClick}
            disabled={!isPublished}
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

export default CourseCard;
