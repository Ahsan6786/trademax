import React, { useState } from 'react';
import { Bell, Check, X, Sparkles, BookOpen, Video } from 'lucide-react';
import { subscribeToPush } from '../../utils/pushNotifications';
import './NotificationPermissionModal.css';

export const NotificationPermissionModal = ({ isOpen, onClose, onComplete, userToken = null }) => {
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  const handleEnable = async () => {
    setIsSubscribing(true);
    setFeedback('');

    try {
      const result = await subscribeToPush(userToken);
      if (result.success) {
        setFeedback('Notifications enabled! You are now subscribed.');
        setTimeout(() => {
          if (onComplete) onComplete(true);
          onClose();
        }, 800);
      } else {
        // Permission denied or dismissed — do NOT block user flow
        console.log('Notification permission not granted:', result.error);
        if (onComplete) onComplete(false);
        onClose();
      }
    } catch (err) {
      console.warn('Error requesting notifications:', err);
      if (onComplete) onComplete(false);
      onClose();
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    // Graceful "Maybe Later": never blocks signup or login
    if (onComplete) onComplete(false);
    onClose();
  };

  return (
    <div className="tm-push-modal-backdrop" role="dialog" aria-modal="true">
      <div className="tm-push-modal-card">
        {/* Header Icon */}
        <div className="tm-push-icon-badge">
          <Bell size={28} className="tm-push-bell-icon" />
        </div>

        {/* Title & Subtitle */}
        <h2 className="tm-push-title">Enable Real-Time Notifications?</h2>
        <p className="tm-push-subtitle">
          Stay disciplined and never miss an institutional briefing, class schedule, or curriculum update.
        </p>

        {/* Value Proposition List */}
        <div className="tm-push-benefits-list">
          <div className="tm-push-benefit-item">
            <div className="tm-benefit-icon-box red">
              <Sparkles size={16} />
            </div>
            <div className="tm-benefit-text">
              <strong>Daily Trading Discipline &amp; Psychology</strong>
              <span>Curated quotes and risk reminders to keep you focused during market hours.</span>
            </div>
          </div>

          <div className="tm-push-benefit-item">
            <div className="tm-benefit-icon-box blue">
              <Video size={16} />
            </div>
            <div className="tm-benefit-text">
              <strong>Live Class Alerts &amp; Meet Links</strong>
              <span>Instant alerts 15 minutes before scheduled Google Meet live sessions.</span>
            </div>
          </div>

          <div className="tm-push-benefit-item">
            <div className="tm-benefit-icon-box green">
              <BookOpen size={16} />
            </div>
            <div className="tm-benefit-text">
              <strong>Course &amp; Enrollment Updates</strong>
              <span>Payment approvals, new lesson drops, and official TradeMax announcements.</span>
            </div>
          </div>
        </div>

        {feedback && (
          <div className="tm-push-feedback-msg">
            <Check size={14} />
            <span>{feedback}</span>
          </div>
        )}

        {/* Actions */}
        <div className="tm-push-actions">
          <button
            type="button"
            className="tm-btn-push-enable"
            onClick={handleEnable}
            disabled={isSubscribing}
          >
            {isSubscribing ? 'Activating...' : 'Enable Notifications'}
          </button>
          <button
            type="button"
            className="tm-btn-push-later"
            onClick={handleDismiss}
            disabled={isSubscribing}
          >
            Maybe Later
          </button>
        </div>

        <p className="tm-push-footer-note">
          You can adjust or disable notifications anytime in your Account Settings.
        </p>
      </div>
    </div>
  );
};
