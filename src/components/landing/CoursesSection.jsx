import React from 'react';
import { CourseCard } from '../courses/CourseCard';
import './CoursesSection.css';

export const CoursesSection = ({ onOpenDetails, onRegister, course, settings, theme }) => {
  return (
    <section id="courses" className="tm-courses-section" aria-label="TRADEMAX Courses">
      <div className="tm-courses-container">
        {/* Section Header */}
        <div className="tm-courses-header">
          <div className="tm-courses-eyebrow">
            <span className="tm-eyebrow-accent">STRUCTURED FINANCIAL EDUCATION</span>
            <span className="tm-eyebrow-sep">·</span>
            <span>BATCH ADMISSIONS</span>
          </div>
          <h2 className="tm-courses-title">
            Featured Trading Program
          </h2>
          <p className="tm-courses-subtitle">
            From market fundamentals to advanced order flow execution — engineered for disciplined traders.
          </p>
        </div>

        {/* Centered Course Card Grid */}
        <div className="tm-courses-grid">
          <CourseCard
            onOpenDetails={onOpenDetails}
            onRegister={onRegister}
            course={course}
            settings={settings}
            theme={theme}
          />
        </div>
      </div>
    </section>
  );
};
