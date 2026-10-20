import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Sparkles,
  Megaphone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Plus,
  Eye,
  Smartphone,
  ExternalLink,
  Users
} from 'lucide-react';
import { isPushNotificationSupported, getSubscriptionStatus, subscribeToPush } from '../../utils/pushNotifications';
import './AdminPushNotifications.css';

export const AdminPushNotifications = ({ courses = [], showNotification }) => {
  const [subTab, setSubTab] = useState('campaigns'); // 'campaigns' | 'create' | 'quotes' | 'logs'
  const [stats, setStats] = useState({
    total_registered_users: 0,
    push_enabled_users: 0,
    active_subscriptions: 0,
    delivered_notifications: 0,
    failed_deliveries: 0,
    active_subscribers: 0,
    total_subscribers: 0,
    total_campaigns: 0,
    total_notifications_sent: 0,
    total_notifications_failed: 0,
    total_quotes: 0,
    active_quotes: 0
  });
  const [campaigns, setCampaigns] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [adminPushSubscribed, setAdminPushSubscribed] = useState(false);

  // New Campaign Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'announcements',
    target_type: 'all',
    target_course_id: '',
    icon_url: '/tm-logo.png',
    action_url: '/',
    schedule_type: 'immediate',
    scheduled_for: ''
  });

  // New Quote Form State
  const [newQuote, setNewQuote] = useState({
    quote: '',
    author: 'TradeMax Mentor',
    topic: 'Discipline'
  });
  const [showAddQuote, setShowAddQuote] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('tm_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/push/admin/stats', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.warn('Failed to fetch push stats:', err);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/push/admin/campaigns', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setCampaigns(data.campaigns);
    } catch {
      showNotification?.('Failed to load notification campaigns.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/push/admin/quotes', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setQuotes(data.quotes);
    } catch {
      showNotification?.('Failed to load motivational quotes.', 'error');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/push/admin/logs', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch {
      showNotification?.('Failed to load delivery logs.', 'error');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCampaigns();
    fetchQuotes();
    getSubscriptionStatus().then((s) => setAdminPushSubscribed(s.isSubscribed));
  }, []);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      showNotification?.('Notification title and message are required.', 'error');
      return;
    }

    if (formData.schedule_type === 'scheduled' && !formData.scheduled_for) {
      showNotification?.('Please select a date and time for the scheduled notification.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/push/admin/campaigns', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showNotification?.(data.message || 'Notification processed successfully!', 'success');
        setFormData({
          title: '',
          message: '',
          category: 'announcements',
          target_type: 'all',
          target_course_id: '',
          icon_url: '/tm-logo.png',
          action_url: '/',
          schedule_type: 'immediate',
          scheduled_for: ''
        });
        setSubTab('campaigns');
        fetchCampaigns();
        fetchStats();
      } else {
        showNotification?.(data.error || 'Failed to dispatch notification.', 'error');
      }
    } catch {
      showNotification?.('Connection error while creating campaign.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!adminPushSubscribed) {
      // Prompt admin to subscribe browser first
      const subRes = await subscribeToPush();
      if (subRes.success) {
        setAdminPushSubscribed(true);
        showNotification?.('Admin browser subscribed! Sending test notification...', 'success');
      } else {
        showNotification?.('Please allow notifications on this browser to receive test notifications.', 'error');
        return;
      }
    }

    setTestSending(true);
    try {
      const res = await fetch('/api/push/admin/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: formData.title || '🔔 TradeMax Test Notification',
          message: formData.message || 'Real-time Web Push notification delivery is working properly.',
          icon_url: formData.icon_url || '/tm-logo.png',
          action_url: formData.action_url || '/admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification?.('Test notification sent to your device!', 'success');
      } else {
        showNotification?.(data.error || 'Failed to send test notification.', 'error');
      }
    } catch {
      showNotification?.('Failed to send test notification.', 'error');
    } finally {
      setTestSending(false);
    }
  };

  const handleSendCampaignNow = async (id) => {
    try {
      const res = await fetch(`/api/push/admin/campaigns/${id}/send`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotification?.(data.message, 'success');
        fetchCampaigns();
        fetchStats();
      } else {
        showNotification?.(data.error || 'Failed to send campaign.', 'error');
      }
    } catch {
      showNotification?.('Error sending campaign.', 'error');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification record?')) return;
    try {
      const res = await fetch(`/api/push/admin/campaigns/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotification?.('Campaign removed.', 'success');
        fetchCampaigns();
        fetchStats();
      }
    } catch {
      showNotification?.('Error deleting campaign.', 'error');
    }
  };

  const handleAddQuote = async (e) => {
    e.preventDefault();
    if (!newQuote.quote.trim()) {
      showNotification?.('Quote text is required.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/push/admin/quotes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newQuote)
      });
      const data = await res.json();
      if (data.success) {
        showNotification?.('Motivational quote added successfully!', 'success');
        setNewQuote({ quote: '', author: 'TradeMax Mentor', topic: 'Discipline' });
        setShowAddQuote(false);
        fetchQuotes();
        fetchStats();
      } else {
        showNotification?.(data.error || 'Failed to add quote.', 'error');
      }
    } catch {
      showNotification?.('Error adding quote.', 'error');
    }
  };

  const handleToggleQuoteActive = async (id, currentStatus) => {
    try {
      const res = await fetch(`/api/push/admin/quotes/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        showNotification?.('Quote status updated.', 'success');
        fetchQuotes();
        fetchStats();
      }
    } catch {
      showNotification?.('Error updating quote status.', 'error');
    }
  };

  const handleDeleteQuote = async (id) => {
    if (!window.confirm('Delete this motivational quote?')) return;
    try {
      const res = await fetch(`/api/push/admin/quotes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotification?.('Quote deleted.', 'success');
        fetchQuotes();
        fetchStats();
      }
    } catch {
      showNotification?.('Error deleting quote.', 'error');
    }
  };

  const handleTriggerDailyQuote = async () => {
    if (!window.confirm('Dispatch the next motivational trading quote to all opted-in subscribers now?')) return;
    try {
      const res = await fetch('/api/push/admin/quotes/send-daily', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showNotification?.(data.message, 'success');
        fetchCampaigns();
        fetchStats();
        fetchQuotes();
      } else {
        showNotification?.(data.error || 'Failed to dispatch daily quote.', 'error');
      }
    } catch {
      showNotification?.('Error dispatching quote.', 'error');
    }
  };

  return (
    <div className="tm-admin-push-container">
      {/* Subtabs */}
      <div className="tm-admin-section-header">
        <div className="tm-admin-subtabs">
          <button
            type="button"
            className={`tm-admin-subtab-btn ${subTab === 'campaigns' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('campaigns');
              fetchCampaigns();
            }}
          >
            <Megaphone size={15} />
            <span>Campaigns</span>
          </button>

          <button
            type="button"
            className={`tm-admin-subtab-btn ${subTab === 'create' ? 'active' : ''}`}
            onClick={() => setSubTab('create')}
          >
            <Plus size={15} />
            <span>Create Notification</span>
          </button>

          <button
            type="button"
            className={`tm-admin-subtab-btn ${subTab === 'quotes' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('quotes');
              fetchQuotes();
            }}
          >
            <Sparkles size={15} />
            <span>Discipline Quotes</span>
            {stats.active_quotes > 0 && (
              <span className="tm-subtab-badge info">{stats.active_quotes}</span>
            )}
          </button>

          <button
            type="button"
            className={`tm-admin-subtab-btn ${subTab === 'logs' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('logs');
              fetchLogs();
            }}
          >
            <Clock size={15} />
            <span>Delivery Logs</span>
          </button>
        </div>
      </div>

      {/* Metrics Row - 5 Essential Production Push Indicators */}
      <div className="tm-admin-stats-grid tm-push-stats-grid">
        <div className="tm-stat-card">
          <div className="tm-stat-icon-wrap blue">
            <Users size={20} />
          </div>
          <div className="tm-stat-data">
            <span className="tm-stat-label">Total Registered Users</span>
            <div className="tm-stat-number">{stats.total_registered_users}</div>
            <span className="tm-stat-hint">Platform user accounts</span>
          </div>
        </div>

        <div className="tm-stat-card">
          <div className="tm-stat-icon-wrap green">
            <Smartphone size={20} />
          </div>
          <div className="tm-stat-data">
            <span className="tm-stat-label">Push-Enabled Users</span>
            <div className="tm-stat-number">{stats.push_enabled_users}</div>
            <span className="tm-stat-hint">Unique users opted-in</span>
          </div>
        </div>

        <div className="tm-stat-card">
          <div className="tm-stat-icon-wrap amber">
            <Bell size={20} />
          </div>
          <div className="tm-stat-data">
            <span className="tm-stat-label">Active Subscriptions</span>
            <div className="tm-stat-number">{stats.active_subscriptions}</div>
            <span className="tm-stat-hint">Active browser endpoints</span>
          </div>
        </div>

        <div className="tm-stat-card">
          <div className="tm-stat-icon-wrap green">
            <Send size={20} />
          </div>
          <div className="tm-stat-data">
            <span className="tm-stat-label">Delivered Notifications</span>
            <div className="tm-stat-number">{stats.delivered_notifications}</div>
            <span className="tm-stat-hint">Confirmed deliveries</span>
          </div>
        </div>

        <div className="tm-stat-card">
          <div className="tm-stat-icon-wrap red">
            <AlertCircle size={20} />
          </div>
          <div className="tm-stat-data">
            <span className="tm-stat-label">Failed Deliveries</span>
            <div className="tm-stat-number">{stats.failed_deliveries}</div>
            <span className="tm-stat-hint">Expired / revoked devices</span>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: CAMPAIGNS LIST */}
      {subTab === 'campaigns' && (
        <div className="tm-admin-table-card">
          <div className="tm-push-table-header">
            <div>
              <h2 className="tm-push-card-title">Push Notification Campaigns</h2>
              <p className="tm-push-card-desc">Scheduled, ongoing, and past notifications.</p>
            </div>
            <button
              type="button"
              className="tm-btn-primary tm-btn-create-push"
              onClick={() => setSubTab('create')}
            >
              <Plus size={14} />
              <span>Create New Notification</span>
            </button>
          </div>

          <div className="tm-admin-table-responsive">
            <table className="tm-admin-table">
              <thead>
                <tr>
                  <th>Title &amp; Message</th>
                  <th>Category</th>
                  <th>Target Audience</th>
                  <th>Schedule / Sent</th>
                  <th>Status</th>
                  <th>Delivered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="tm-table-loading">
                      <RefreshCw size={18} className="spin" />
                      <span>Loading campaigns...</span>
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="tm-table-empty">
                      <Megaphone size={28} />
                      <p>No push notification campaigns created yet.</p>
                    </td>
                  </tr>
                ) : (
                  campaigns.map((camp) => (
                    <tr key={camp.id}>
                      <td>
                        <div className="tm-push-campaign-title-cell">
                          <strong>{camp.title}</strong>
                          <span>{camp.message}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`tm-category-badge ${camp.category}`}>
                          {camp.category === 'motivation'
                            ? 'Daily Motivation'
                            : camp.category === 'live_classes'
                            ? 'Live Class'
                            : camp.category === 'courses'
                            ? 'Course Update'
                            : 'Announcement'}
                        </span>
                      </td>
                      <td>
                        <span className="tm-audience-text">
                          {camp.target_type === 'course'
                            ? `Course: ${camp.course_title || camp.target_course_id}`
                            : 'All Opted-in Users'}
                        </span>
                      </td>
                      <td>
                        <span className="tm-date-cell">
                          {camp.status === 'scheduled' && camp.scheduled_for
                            ? `Scheduled: ${new Date(camp.scheduled_for).toLocaleString('en-IN')}`
                            : camp.sent_at
                            ? `Sent: ${new Date(camp.sent_at).toLocaleString('en-IN')}`
                            : new Date(camp.created_at).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <span className={`tm-status-pill ${camp.status?.toLowerCase()}`}>
                          {camp.status === 'sent'
                            ? 'Sent'
                            : camp.status === 'scheduled'
                            ? 'Scheduled'
                            : camp.status === 'processing'
                            ? 'Sending'
                            : camp.status === 'failed'
                            ? 'Failed'
                            : 'Draft'}
                        </span>
                      </td>
                      <td>
                        <div className="tm-delivery-stats">
                          <span className="text-success font-bold">{camp.sent_count} sent</span>
                          {camp.failure_count > 0 && (
                            <span className="text-danger text-xs">({camp.failure_count} failed)</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="tm-actions-cell" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                          {(camp.status === 'scheduled' || camp.status === 'failed') && (
                            <button
                              type="button"
                              className="tm-btn-table-action success"
                              onClick={() => handleSendCampaignNow(camp.id)}
                              title={camp.status === 'failed' ? 'Retry sending now' : 'Send immediately now'}
                            >
                              <Send size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="tm-btn-table-action danger"
                            onClick={() => handleDeleteCampaign(camp.id)}
                            title="Delete campaign"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CREATE NOTIFICATION FORM WITH DEVICE PREVIEW */}
      {subTab === 'create' && (
        <div className="tm-push-create-grid">
          {/* Form */}
          <div className="tm-push-form-card">
            <h2 className="tm-push-card-title">Compose Web Push Notification</h2>
            <p className="tm-push-card-desc">
              Deliver directly to users' lock screens and system notification trays.
            </p>

            <form onSubmit={handleCreateCampaign} className="tm-push-compose-form">
              <div className="tm-form-group">
                <label className="tm-form-label">
                  Notification Title <span className="tm-req">*</span>
                </label>
                <input
                  type="text"
                  className="tm-admin-input"
                  placeholder="e.g. ⚡ Live Market Session Starting in 15m"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>

              <div className="tm-form-group">
                <label className="tm-form-label">
                  Notification Message Body <span className="tm-req">*</span>
                </label>
                <textarea
                  className="tm-admin-textarea"
                  rows={3}
                  placeholder="e.g. Mentor Patil Trader is going live on Google Meet. Join now to review today's institutional order flow."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  maxLength={250}
                  required
                />
                <span className="tm-char-count">{formData.message.length}/250 characters</span>
              </div>

              <div className="tm-form-row-2">
                <div className="tm-form-group">
                  <label className="tm-form-label">Category</label>
                  <select
                    className="tm-admin-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="announcements">General Announcements</option>
                    <option value="live_classes">Live Class Reminders</option>
                    <option value="courses">Course Updates</option>
                    <option value="motivation">Motivational Quotes</option>
                  </select>
                </div>

                <div className="tm-form-group">
                  <label className="tm-form-label">Target Audience</label>
                  <select
                    className="tm-admin-select"
                    value={formData.target_type}
                    onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                  >
                    <option value="all">All Eligible Users ({stats.active_subscriptions || stats.push_enabled_users || 0} active devices)</option>
                    <option value="course">Students Enrolled in a Specific Course</option>
                  </select>
                </div>
              </div>

              {formData.target_type === 'course' && (
                <div className="tm-form-group">
                  <label className="tm-form-label">Select Course</label>
                  <select
                    className="tm-admin-select"
                    value={formData.target_course_id}
                    onChange={(e) => setFormData({ ...formData, target_course_id: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="tm-form-row-2">
                <div className="tm-form-group">
                  <label className="tm-form-label">Click Action URL</label>
                  <input
                    type="text"
                    className="tm-admin-input"
                    placeholder="e.g. /dashboard or /live-classes"
                    value={formData.action_url}
                    onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
                  />
                </div>

                <div className="tm-form-group">
                  <label className="tm-form-label">Delivery Schedule</label>
                  <select
                    className="tm-admin-select"
                    value={formData.schedule_type}
                    onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                  >
                    <option value="immediate">Send Immediately</option>
                    <option value="scheduled">Schedule for Future Delivery</option>
                  </select>
                </div>
              </div>

              {formData.schedule_type === 'scheduled' && (
                <div className="tm-form-group">
                  <label className="tm-form-label">
                    Schedule Date &amp; Time <span className="tm-req">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="tm-admin-input"
                    value={formData.scheduled_for}
                    onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="tm-compose-actions">
                <button
                  type="button"
                  className="tm-btn-test-send"
                  onClick={handleSendTestNotification}
                  disabled={testSending}
                >
                  <Smartphone size={15} />
                  <span>{testSending ? 'Sending Test...' : 'Send Test to My Device'}</span>
                </button>

                <button
                  type="submit"
                  className="tm-btn-primary tm-btn-submit-campaign"
                  disabled={submitting}
                >
                  <Send size={15} />
                  <span>
                    {submitting
                      ? 'Dispatching...'
                      : formData.schedule_type === 'scheduled'
                      ? 'Schedule Notification'
                      : 'Dispatch Notification Now'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Real-Time Device Mockup Preview */}
          <div className="tm-push-preview-card">
            <h3 className="tm-preview-header">Live Notification Preview</h3>
            <p className="tm-preview-sub">Simulated appearance on lock screen / system banner</p>

            <div className="tm-phone-mockup">
              <div className="tm-phone-speaker"></div>
              <div className="tm-mock-time">9:41 AM</div>

              <div className="tm-push-bubble">
                <div className="tm-push-bubble-header">
                  <div className="tm-push-app-id">
                    <img src="/tm-logo.png" alt="TradeMax" className="tm-push-app-icon" />
                    <strong>TRADEMAX</strong>
                  </div>
                  <span className="tm-push-time-ago">now</span>
                </div>

                <div className="tm-push-bubble-title">
                  {formData.title || 'Notification Title Here'}
                </div>
                <div className="tm-push-bubble-body">
                  {formData.message || 'The notification message body will appear here on the student\'s mobile device or desktop tray.'}
                </div>
              </div>
            </div>

            <div className="tm-preview-tip">
              <CheckCircle size={14} className="text-success" />
              <span>Standard Web Push API payload with click redirection to <code>{formData.action_url || '/'}</code></span>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: MOTIVATIONAL DISCIPLINE QUOTES */}
      {subTab === 'quotes' && (
        <div className="tm-admin-table-card">
          <div className="tm-push-table-header">
            <div>
              <h2 className="tm-push-card-title">Trading Psychology &amp; Discipline Quotes</h2>
              <p className="tm-push-card-desc">
                Curated rules for daily motivational broadcasts to keep students patient and risk-conscious.
              </p>
            </div>
            <div className="tm-quotes-header-actions">
              <button
                type="button"
                className="tm-btn-action-alt"
                onClick={handleTriggerDailyQuote}
                title="Send the next quote to all subscribers right now"
              >
                <Sparkles size={14} />
                <span>Send Daily Quote Now</span>
              </button>
              <button
                type="button"
                className="tm-btn-primary tm-btn-create-push"
                onClick={() => setShowAddQuote(!showAddQuote)}
              >
                <Plus size={14} />
                <span>Add New Quote</span>
              </button>
            </div>
          </div>

          {/* Add Quote Inline Card */}
          {showAddQuote && (
            <form onSubmit={handleAddQuote} className="tm-add-quote-box">
              <h4 className="tm-add-quote-title">Add Inspirational Trading Quote</h4>
              <div className="tm-form-group">
                <label className="tm-form-label">
                  Quote Text <span className="tm-req">*</span>
                </label>
                <textarea
                  className="tm-admin-textarea"
                  rows={2}
                  placeholder="e.g. Discipline beats prediction. Follow your strategy, manage your risk, and trust your process."
                  value={newQuote.quote}
                  onChange={(e) => setNewQuote({ ...newQuote, quote: e.target.value })}
                  required
                />
              </div>

              <div className="tm-form-row-2">
                <div className="tm-form-group">
                  <label className="tm-form-label">Author / Attributed</label>
                  <input
                    type="text"
                    className="tm-admin-input"
                    value={newQuote.author}
                    onChange={(e) => setNewQuote({ ...newQuote, author: e.target.value })}
                  />
                </div>
                <div className="tm-form-group">
                  <label className="tm-form-label">Topic / Theme</label>
                  <select
                    className="tm-admin-select"
                    value={newQuote.topic}
                    onChange={(e) => setNewQuote({ ...newQuote, topic: e.target.value })}
                  >
                    <option value="Discipline">Discipline</option>
                    <option value="Patience">Patience</option>
                    <option value="Risk Management">Risk Management</option>
                    <option value="Consistency">Consistency</option>
                    <option value="Psychology">Psychology</option>
                  </select>
                </div>
              </div>

              <div className="tm-add-quote-btns">
                <button
                  type="button"
                  className="tm-btn-cancel-clean"
                  onClick={() => setShowAddQuote(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="tm-btn-primary">
                  Save Quote to Library
                </button>
              </div>
            </form>
          )}

          {/* Quotes Table */}
          <div className="tm-admin-table-responsive">
            <table className="tm-admin-table">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>Topic</th>
                  <th>Author</th>
                  <th>Last Dispatched</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="tm-table-empty">
                      <Sparkles size={28} />
                      <p>No quotes in the library.</p>
                    </td>
                  </tr>
                ) : (
                  quotes.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <blockquote className="tm-quote-text">“{q.quote}”</blockquote>
                      </td>
                      <td>
                        <span className="tm-topic-pill">{q.topic || 'Discipline'}</span>
                      </td>
                      <td>
                        <span className="tm-author-text">{q.author || 'TradeMax'}</span>
                      </td>
                      <td>
                        <span className="tm-date-cell">
                          {q.last_sent_at
                            ? new Date(q.last_sent_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Never sent'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`tm-btn-status-toggle ${q.is_active ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleQuoteActive(q.id, q.is_active)}
                        >
                          {q.is_active ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td>
                        <div className="tm-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="tm-btn-table-action danger"
                            onClick={() => handleDeleteQuote(q.id)}
                            title="Delete Quote"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: DELIVERY LOGS */}
      {subTab === 'logs' && (
        <div className="tm-admin-table-card">
          <div className="tm-push-table-header">
            <div>
              <h2 className="tm-push-card-title">Push Delivery Logs</h2>
              <p className="tm-push-card-desc">Audit records of sent and failed notification attempts.</p>
            </div>
            <button
              type="button"
              className="tm-btn-refresh"
              onClick={fetchLogs}
              title="Refresh logs"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="tm-admin-table-responsive">
            <table className="tm-admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Campaign Title</th>
                  <th>Recipient User</th>
                  <th>Status</th>
                  <th>Details / Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="tm-table-empty">
                      <Clock size={28} />
                      <p>No delivery logs recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span className="tm-date-cell">
                          {new Date(log.delivered_at).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <strong>{log.campaign_title || `Campaign #${log.campaign_id}`}</strong>
                      </td>
                      <td>
                        <span className="tm-user-email">{log.user_email || `User #${log.user_id}`}</span>
                      </td>
                      <td>
                        <span className={`tm-status-pill ${log.status === 'delivered' ? 'approved' : 'rejected'}`}>
                          {log.status === 'delivered' ? 'Delivered' : 'Failed'}
                        </span>
                      </td>
                      <td>
                        <span className="tm-error-details-text">
                          {log.error_message || 'OK (Delivered to endpoint)'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
