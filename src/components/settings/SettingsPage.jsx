import React, { useState, useEffect } from 'react';
import './SettingsPage.css';

import { authService } from '../../services/auth';

export const SettingsPage = ({
  user,
  onBack,
  onNavigate,
  theme = 'dark',
  onToggleTheme,
  onOpenAuth,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', text: '' }

  // Student Profile details
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    trading_experience: user?.trading_experience || 'Intermediate',
  });
  const [profileSaving, setProfileSaving] = useState(false);

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
      </main>
    </div>
  );
};

export default SettingsPage;
