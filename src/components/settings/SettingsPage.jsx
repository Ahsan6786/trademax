import React, { useState, useEffect } from 'react';
import { LogOut, Bell, BellOff, Sparkles, Video, BookOpen, AlertCircle, Check } from 'lucide-react';
import './SettingsPage.css';

import { authService } from '../../services/auth';
import {
  isPushNotificationSupported,
  getSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  fetchNotificationPreferences,
  saveNotificationPreferences
} from '../../utils/pushNotifications';

export const SettingsPage = ({
  user,
  onBack,
  onNavigate,
  theme = 'dark',
  onToggleTheme,
  onLogout,
  onOpenAuth,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', text: '' }

  // Web Push Notification State
  const [pushStatus, setPushStatus] = useState({ supported: false, permission: 'default', isSubscribed: false });
  const [pushPreferences, setPushPreferences] = useState({
    notify_motivation: true,
    notify_courses: true,
    notify_live_classes: true,
    notify_announcements: true,
  });
  const [pushLoading, setPushLoading] = useState(false);

  // Student Profile details
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    trading_experience: user?.trading_experience || 'Intermediate',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    // Check push status and preferences
    getSubscriptionStatus().then((status) => {
      setPushStatus(status);
      if (status.isSubscribed) {
        fetchNotificationPreferences().then((prefs) => {
          if (prefs) setPushPreferences(prefs);
        });
      }
    });
  }, [user]);

  const handleTogglePushSubscription = async () => {
    setPushLoading(true);
    try {
      if (pushStatus.isSubscribed) {
        const res = await unsubscribeFromPush();
        if (res.success) {
          setPushStatus((prev) => ({ ...prev, isSubscribed: false }));
          showNotification('Push notifications disabled on this device.', 'success');
        } else {
          showNotification('Failed to disable notifications.', 'error');
        }
      } else {
        const res = await subscribeToPush(null, pushPreferences);
        if (res.success) {
          setPushStatus((prev) => ({ ...prev, isSubscribed: true, permission: 'granted' }));
          showNotification('Push notifications enabled successfully!', 'success');
        } else if (res.denied) {
          showNotification('Notification permission was blocked in your browser settings.', 'error');
          setPushStatus((prev) => ({ ...prev, permission: 'denied' }));
        } else {
          showNotification(res.error || 'Failed to enable notifications.', 'error');
        }
      }
    } catch {
      showNotification('Error updating notification subscription.', 'error');
    } finally {
      setPushLoading(false);
    }
  };

  const handlePreferenceChange = async (key) => {
    const updated = { ...pushPreferences, [key]: !pushPreferences[key] };
    setPushPreferences(updated);
    if (pushStatus.isSubscribed) {
      await saveNotificationPreferences(updated);
      showNotification('Notification preferences updated.', 'success');
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        trading_experience: user.trading_experience || 'Intermediate',
      });

      // Synchronize latest profile data from PostgreSQL
      fetch('/api/student/dashboard', { credentials: 'include' })
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data?.profile) {
            setProfileForm({
              name: res.data.profile.name || '',
              email: res.data.profile.email || user.email || '',
              mobile: res.data.profile.mobile || '',
              trading_experience: res.data.profile.trading_experience || 'Intermediate',
            });
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const showNotification = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      showNotification('Full name is required.', 'error');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Profile successfully updated!', 'success');
        if (data.user) {
          authService.setCachedUser(data.user);
        }
      } else {
        showNotification(data.error || 'Failed to update profile.', 'error');
      }
    } catch {
      showNotification('Connection error while saving profile.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      showNotification('New password must be at least 6 characters long.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('New password and confirmation password do not match.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (user) {
        // Authenticated user changing password
        const res = await fetch('/api/auth/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        });

        const data = await res.json();
        if (data.success) {
          showNotification(data.message || 'Password successfully updated!', 'success');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          showNotification(data.error || 'Failed to update password.', 'error');
        }
      } else {
        // Guest user creating/resetting password
        if (!guestEmail || !/\S+@\S+\.\S+/.test(guestEmail.trim())) {
          showNotification('Please enter a valid registered email address.', 'error');
          setSaving(false);
          return;
        }

        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: guestEmail.trim(),
            newPassword,
          }),
        });

        const data = await res.json();
        if (data.success) {
          showNotification(data.message || 'New password set successfully! You can now sign in.', 'success');
          setGuestEmail('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          showNotification(data.error || 'Failed to reset password.', 'error');
        }
      }
    } catch (err) {
      console.error('Password save error:', err);
      showNotification('Connection error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`tm-settings-page-root tm-theme-${theme}`}>
      {/* Top Header */}
      <header className="tm-settings-header">
        <div className="tm-settings-header-left">
          <button
            type="button"
            className="tm-settings-back-btn"
            onClick={onBack || (() => onNavigate && onNavigate('landing'))}
            aria-label="Back to Home"
          >
            <span aria-hidden="true">&larr;</span>
            <span className="tm-settings-back-text">Back</span>
          </button>

          <div className="tm-settings-branding">
            <span className="tm-settings-title">Account Settings</span>
            <span className="tm-settings-subtitle">Password &amp; Security Preferences</span>
          </div>
        </div>

        <div className="tm-settings-header-right">
          {onToggleTheme && (
            <button
              type="button"
              className="tm-settings-theme-btn"
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Day' : 'Night'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? 'DAY' : 'NIGHT'}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="tm-settings-main">
        {notification && (
          <div className={`tm-settings-alert tm-alert-${notification.type}`} role="alert">
            <span className="tm-alert-badge">
              {notification.type === 'success' ? '✓ SUCCESS' : '✕ NOTICE'}
            </span>
            <span className="tm-alert-text">{notification.text}</span>
          </div>
        )}

        {/* User Status Bar if logged in */}
        {user ? (
          <div className="tm-settings-user-strip">
            <div className="tm-settings-user-avatar">
              {(user.name || 'ST').slice(0, 2).toUpperCase()}
            </div>
            <div className="tm-settings-user-meta">
              <span className="tm-settings-user-name">{user.name || 'TradeMax Student'}</span>
              <span className="tm-settings-user-email">{user.email}</span>
            </div>
            {onLogout && (
              <button
                type="button"
                className="tm-settings-strip-logout-btn"
                onClick={onLogout}
                title="Sign Out of TradeMax"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        ) : (
          <div className="tm-settings-guest-strip">
            <div className="tm-settings-guest-info">
              <span className="tm-settings-guest-title">Not currently signed in</span>
              <span className="tm-settings-guest-desc">Enter your registered email below to create a new password, or sign in directly.</span>
            </div>
            {onOpenAuth && (
              <button
                type="button"
                className="tm-settings-signin-cta"
                onClick={() => onOpenAuth('login')}
              >
                Sign In
              </button>
            )}
          </div>
        )}

        {/* PROFILE INFORMATION CARD (when logged in) */}
        {user && (
          <div className="tm-settings-card">
            <div className="tm-settings-card-header">
              <span className="tm-settings-card-eyebrow">STUDENT IDENTITY</span>
              <h2 className="tm-settings-card-title">Profile Information</h2>
              <p className="tm-settings-card-desc">
                Your personal and trading details linked to your official TRADEMAX account.
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="tm-settings-form">
              <div className="tm-form-group">
                <label className="tm-form-label" htmlFor="profile-name">
                  Full Name <span className="tm-req">*</span>
                </label>
                <input
                  id="profile-name"
                  type="text"
                  className="tm-form-control"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="e.g. Patil Trader"
                  required
                />
              </div>

              <div className="tm-form-group">
                <label className="tm-form-label" htmlFor="profile-email">
                  Registered Email Address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  className="tm-form-control is-readonly"
                  value={user?.email || profileForm.email}
                  disabled
                  readOnly
                />
                <span className="tm-field-hint">Primary institutional email cannot be modified directly.</span>
              </div>

              <div className="tm-form-group">
                <label className="tm-form-label" htmlFor="profile-mobile">
                  Mobile Number <span className="tm-req">*</span>
                </label>
                <input
                  id="profile-mobile"
                  type="tel"
                  className="tm-form-control"
                  value={profileForm.mobile}
                  onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>

              <div className="tm-form-group">
                <label className="tm-form-label" htmlFor="profile-exp">
                  Trading Experience Level
                </label>
                <select
                  id="profile-exp"
                  className="tm-form-control tm-form-select"
                  value={profileForm.trading_experience}
                  onChange={(e) => setProfileForm({ ...profileForm, trading_experience: e.target.value })}
                >
                  <option value="Beginner">Beginner (0-1 Years)</option>
                  <option value="Intermediate">Intermediate (1-3 Years)</option>
                  <option value="Advanced">Advanced (3-5 Years)</option>
                  <option value="Professional">Professional (Institutional)</option>
                </select>
              </div>

              <div className="tm-form-actions">
                <button
                  type="submit"
                  className="tm-settings-submit-btn"
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving Profile...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PRIMARY CARD: Create New Password */}
        <div className="tm-settings-card">
          <div className="tm-settings-card-header">
            <span className="tm-settings-card-eyebrow">CREDENTIAL MANAGEMENT</span>
            <h2 className="tm-settings-card-title">Create New Password</h2>
            <p className="tm-settings-card-desc">
              {user
                ? 'Update your portal login password to keep your trading account secure.'
                : 'Set a new password for your TradeMax student portal account using your registered email.'}
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="tm-settings-form">
            {!user && (
              <div className="tm-form-group">
                <label className="tm-form-label" htmlFor="guest-email">
                  Registered Email Address <span className="tm-req">*</span>
                </label>
                <input
                  id="guest-email"
                  type="email"
                  className="tm-form-control"
                  placeholder="e.g. yourname@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {user && (
              <div className="tm-form-group">
                <label className="tm-form-label" htmlFor="current-pw">
                  Current Password <span className="tm-req">*</span>
                </label>
                <input
                  id="current-pw"
                  type="password"
                  className="tm-form-control"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="tm-form-group">
              <label className="tm-form-label" htmlFor="new-pw">
                New Password <span className="tm-req">*</span>
              </label>
              <input
                id="new-pw"
                type="password"
                className="tm-form-control"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="tm-form-group">
              <label className="tm-form-label" htmlFor="confirm-pw">
                Confirm New Password <span className="tm-req">*</span>
              </label>
              <input
                id="confirm-pw"
                type="password"
                className="tm-form-control"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="tm-form-actions">
              <button
                type="submit"
                className="tm-settings-submit-btn"
                disabled={saving}
              >
                {saving ? 'Updating Password...' : user ? 'Update Password' : 'Set New Password'}
              </button>
            </div>
          </form>
        </div>

        {/* SECONDARY CARD: Display & Theme */}
        <div className="tm-settings-card">
          <div className="tm-settings-card-header">
            <span className="tm-settings-card-eyebrow">PORTAL APPEARANCE</span>
            <h3 className="tm-settings-card-title">Theme &amp; Display Mode</h3>
            <p className="tm-settings-card-desc">
              Choose your visual trading theme. Night mode offers high-contrast trading charts while Day mode provides clean readability.
            </p>
          </div>

          <div className="tm-theme-selector-box">
            <div className="tm-theme-info">
              <span className="tm-theme-status-label">Current Mode:</span>
              <span className="tm-theme-status-val">{theme === 'dark' ? 'Night Mode (Institutional Black)' : 'Day Mode (Clean Light)'}</span>
            </div>
            {onToggleTheme && (
              <button
                type="button"
                className="tm-theme-toggle-action-btn"
                onClick={onToggleTheme}
              >
                Switch to {theme === 'dark' ? 'Day Mode' : 'Night Mode'}
              </button>
            )}
          </div>
        </div>

        {/* PUSH NOTIFICATIONS CARD */}
        <div className="tm-settings-card">
          <div className="tm-settings-card-header">
            <span className="tm-settings-card-eyebrow">PWA WEB PUSH NOTIFICATIONS</span>
            <h3 className="tm-settings-card-title">Alerts &amp; Direct Notifications</h3>
            <p className="tm-settings-card-desc">
              Receive timely trading discipline quotes, class reminders, and administrative updates directly on your device.
            </p>
          </div>

          <div className="tm-push-settings-box">
            <div className="tm-push-status-row">
              <div className="tm-push-status-info">
                <span className="tm-theme-status-label">Notification Status:</span>
                <span className={`tm-push-status-badge ${pushStatus.isSubscribed ? 'active' : 'inactive'}`}>
                  {pushStatus.isSubscribed ? (
                    <>
                      <Bell size={13} />
                      <span>Active (Subscribed)</span>
                    </>
                  ) : pushStatus.permission === 'denied' ? (
                    <>
                      <AlertCircle size={13} />
                      <span>Blocked in Browser</span>
                    </>
                  ) : (
                    <>
                      <BellOff size={13} />
                      <span>Disabled</span>
                    </>
                  )}
                </span>
              </div>

              {pushStatus.permission === 'denied' ? (
                <span className="tm-push-hint-text">
                  Notifications were blocked. Please allow notifications in your browser's site settings.
                </span>
              ) : (
                <button
                  type="button"
                  className={`tm-btn-push-toggle ${pushStatus.isSubscribed ? 'danger' : 'primary'}`}
                  onClick={handleTogglePushSubscription}
                  disabled={pushLoading}
                >
                  {pushLoading
                    ? 'Updating...'
                    : pushStatus.isSubscribed
                    ? 'Disable Notifications'
                    : 'Enable Push Notifications'}
                </button>
              )}
            </div>

            {pushStatus.isSubscribed && (
              <div className="tm-push-preferences-grid">
                <h4 className="tm-pref-section-title">Notification Categories</h4>

                <label className="tm-pref-toggle-item">
                  <div className="tm-pref-item-text">
                    <strong>Daily Trading Discipline</strong>
                    <span>Motivational quotes and psychology reminders during market sessions.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushPreferences.notify_motivation}
                    onChange={() => handlePreferenceChange('notify_motivation')}
                  />
                </label>

                <label className="tm-pref-toggle-item">
                  <div className="tm-pref-item-text">
                    <strong>Live Classes &amp; Google Meet</strong>
                    <span>Reminders 15 minutes before scheduled institutional live sessions.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushPreferences.notify_live_classes}
                    onChange={() => handlePreferenceChange('notify_live_classes')}
                  />
                </label>

                <label className="tm-pref-toggle-item">
                  <div className="tm-pref-item-text">
                    <strong>Course &amp; Enrollment Updates</strong>
                    <span>Payment approvals, curriculum releases, and course material additions.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushPreferences.notify_courses}
                    onChange={() => handlePreferenceChange('notify_courses')}
                  />
                </label>

                <label className="tm-pref-toggle-item">
                  <div className="tm-pref-item-text">
                    <strong>General Announcements</strong>
                    <span>Institutional broadcasts, cohort schedules, and platform updates.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushPreferences.notify_announcements}
                    onChange={() => handlePreferenceChange('notify_announcements')}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* TERTIARY CARD: Session & Sign Out */}
        {user && onLogout && (
          <div className="tm-settings-card tm-settings-signout-card">
            <div className="tm-settings-card-header">
              <span className="tm-settings-card-eyebrow" style={{ color: '#EF4444' }}>SESSION MANAGEMENT</span>
              <h3 className="tm-settings-card-title">Sign Out of Account</h3>
              <p className="tm-settings-card-desc">
                Log out of your active student session on this device. You will need to sign in again to access course materials, live classes, and trading simulations.
              </p>
            </div>

            <div className="tm-settings-signout-box">
              <button
                type="button"
                className="tm-settings-danger-signout-btn"
                onClick={onLogout}
              >
                <LogOut size={16} />
                <span>Sign Out of TradeMax</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SettingsPage;
