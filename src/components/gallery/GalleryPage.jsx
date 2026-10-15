import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, ArrowLeft } from 'lucide-react';
import { FOUNDER_IMAGES } from './founderImagesData';
import './GalleryPage.css';

export const GalleryPage = ({ onNavigate, onBack, theme = 'dark' }) => {
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(null);
  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);

  const openLightbox = (index) => {
    setActiveLightboxIndex(index);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  };

  const closeLightbox = useCallback(() => {
    setActiveLightboxIndex(null);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }, []);

  const showNext = useCallback(() => {
    if (activeLightboxIndex !== null) {
      setActiveLightboxIndex((prev) => (prev + 1) % FOUNDER_IMAGES.length);
    }
  }, [activeLightboxIndex]);

  const showPrev = useCallback(() => {
    if (activeLightboxIndex !== null) {
      setActiveLightboxIndex((prev) =>
        prev === 0 ? FOUNDER_IMAGES.length - 1 : prev - 1
      );
    }
  }, [activeLightboxIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (activeLightboxIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        showNext();
      } else if (e.key === 'ArrowLeft') {
        showPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxIndex, closeLightbox, showNext, showPrev]);

  // Touch / Swipe navigation for mobile
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    touchEndXRef.current = e.changedTouches[0].clientX;
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const diffX = touchStartXRef.current - touchEndXRef.current;
      if (Math.abs(diffX) > 40) {
        if (diffX > 0) {
          // Swiped left -> show next
          showNext();
        } else {
          // Swiped right -> show prev
          showPrev();
        }
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const activeImage =
    activeLightboxIndex !== null ? FOUNDER_IMAGES[activeLightboxIndex] : null;

  return (
    <div className={`tm-gallery-page tm-gallery-theme-${theme}`}>
      {/* Editorial Page Header */}
      <div className="tm-gallery-header-section">
        <div className="tm-gallery-header-container">
          <div className="tm-gallery-nav-row">
            <button
              type="button"
              className="tm-gallery-back-btn"
              onClick={() => (onBack ? onBack() : onNavigate ? onNavigate('landing') : null)}
              aria-label="Back to previous page"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <div className="tm-gallery-breadcrumbs">
              <span
                className="tm-crumb-link"
                onClick={() => onNavigate && onNavigate('landing')}
              >
                Home
              </span>
              <span className="tm-crumb-sep">/</span>
              <span
                className="tm-crumb-link"
                onClick={() => onNavigate && onNavigate('founder')}
              >
                Founder
              </span>
              <span className="tm-crumb-sep">/</span>
              <span className="tm-crumb-current">Gallery</span>
            </div>
          </div>

          <div className="tm-gallery-title-block">
            <span className="tm-gallery-eyebrow">GALLERY</span>
            <h1 className="tm-gallery-main-title">Gallery</h1>
          </div>
        </div>
      </div>

      {/* Main Editorial Asymmetric / Masonry Grid — No cards, no boxed borders, natural aspect ratios */}
      <main className="tm-gallery-content">
        <div className="tm-gallery-grid-container">
          <div className="tm-gallery-editorial-grid">
            {FOUNDER_IMAGES.map((img, idx) => (
              <div
                key={img.id}
                className={`tm-gallery-item-wrap tm-item-pos-${idx}`}
                onClick={() => openLightbox(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(idx);
                  }
                }}
                aria-label={`View full photograph: ${img.title}`}
              >
                <div className="tm-gallery-photo-frame">
                  <img
                    src={img.src}
                    alt={img.alt}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    className="tm-gallery-img"
                  />
                  <div className="tm-gallery-photo-overlay">
                    <div className="tm-gallery-overlay-meta">
                      <span className="tm-gallery-photo-title">{img.title}</span>
                      <span className="tm-gallery-photo-sub">{img.subtitle}</span>
                    </div>
                    <div className="tm-gallery-expand-hint" aria-hidden="true">
                      <Maximize2 size={16} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Full-Screen Cinema Lightbox */}
      {activeImage && (
        <div
          className="tm-lightbox-overlay"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen image view"
        >
          {/* Top Bar with Counter and Close */}
          <div
            className="tm-lightbox-topbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tm-lightbox-counter">
              <span className="tm-counter-current">{activeLightboxIndex + 1}</span>
              <span className="tm-counter-sep">/</span>
              <span className="tm-counter-total">{FOUNDER_IMAGES.length}</span>
            </div>
            <div className="tm-lightbox-title-text">{activeImage.title}</div>
            <button
              type="button"
              className="tm-lightbox-close-btn"
              onClick={closeLightbox}
              aria-label="Close full-screen image"
            >
              <X size={22} />
            </button>
          </div>

          {/* Navigation Arrows */}
          <button
            type="button"
            className="tm-lightbox-nav-btn prev"
            onClick={(e) => {
              e.stopPropagation();
              showPrev();
            }}
            aria-label="Previous photograph"
          >
            <ChevronLeft size={28} />
          </button>

          <button
            type="button"
            className="tm-lightbox-nav-btn next"
            onClick={(e) => {
              e.stopPropagation();
              showNext();
            }}
            aria-label="Next photograph"
          >
            <ChevronRight size={28} />
          </button>

          {/* Main Photo Container */}
          <div
            className="tm-lightbox-stage"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="tm-lightbox-photo"
            />
            <div className="tm-lightbox-caption">
              <span className="tm-caption-title">{activeImage.title}</span>
              <span className="tm-caption-sub">{activeImage.subtitle}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
