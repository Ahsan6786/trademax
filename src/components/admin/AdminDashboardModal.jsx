import React, { useState, useEffect } from 'react';
import './AdminDashboardModal.css';

export const AdminDashboardModal = ({ isOpen, onClose, onSettingsUpdated }) => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInterest, setFilterInterest] = useState('ALL');
  const [settingsForm, setSettingsForm] = useState({
    batchName: 'November',
    seatsAvailable: 15,
    showSeatCount: false,
    announcementText: 'November Batch — Limited Seats Available',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Fetch registrations and settings when opened
  useEffect(() => {
    if (isOpen) {
      fetchRegistrations();
      fetchSettings();
    }
  }, [isOpen]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/courses/admin/registrations');
      const data = await res.json();
      if (data.success) {
        setRegistrations(data.registrations || []);
      }
    } catch (err) {
      console.error('Failed to load registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/courses/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettingsForm({
          batchName: data.settings.batchName || 'November',
          seatsAvailable: data.settings.seatsAvailable || 15,
          showSeatCount: Boolean(data.settings.showSeatCount),
          announcementText: data.settings.announcementText || 'November Batch — Limited Seats Available',
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/courses/admin/registrations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMsg('');
    try {
      const res = await fetch('/api/courses/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMsg('Batch settings & seat count saved successfully.');
        if (onSettingsUpdated) {
          onSettingsUpdated(data.settings);
        }
        setTimeout(() => setSettingsMsg(''), 4000);
      }
    } catch (err) {
      setSettingsMsg('Failed to update settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleExportExcel = () => {
    window.location.href = '/api/courses/admin/export';
  };

  if (!isOpen) return null;

  const filteredRegistrations = registrations.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      r.name?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.mobile?.includes(term);
    const matchesInterest =
      filterInterest === 'ALL' || r.interest?.toLowerCase() === filterInterest.toLowerCase();
    return matchesSearch && matchesInterest;
  });

  return (
    <div
      className="tm-admin-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-dashboard-title"
    >
      <div className="tm-admin-modal-window">
        {/* Header */}
        <div className="tm-admin-modal-header">
          <div className="tm-admin-header-title-group">
            <span className="tm-admin-badge">ADMINISTRATION PORTAL</span>
            <h2 id="admin-dashboard-title" className="tm-admin-title">
              Course Registrations &amp; Admissions
            </h2>
          </div>
          <div className="tm-admin-header-actions">
            <button
              type="button"
              className="tm-btn-excel-export"
              onClick={handleExportExcel}
              title="Download all registrations as Excel spreadsheet"
            >
              📥 Export to Excel (.csv)
            </button>
            <button
              type="button"
              className="tm-admin-close-btn"
              onClick={onClose}
              aria-label="Close admin dashboard"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Top Controls: Seat & Batch Management */}
        <div className="tm-admin-settings-card">
          <h3 className="tm-admin-section-heading">Manage Batch Seats &amp; Announcement</h3>
          {settingsMsg && <div className="tm-admin-alert-banner">{settingsMsg}</div>}
          <form onSubmit={handleSaveSettings} className="tm-admin-settings-form">
            <div className="tm-admin-settings-grid">
              <div className="tm-adm-field">
                <label>BATCH NAME</label>
                <input
                  type="text"
                  value={settingsForm.batchName}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, batchName: e.target.value })
                  }
                  placeholder="e.g. November"
                />
              </div>

              <div className="tm-adm-field">
                <label>AVAILABLE SEATS</label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={settingsForm.seatsAvailable}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      seatsAvailable: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>

              <div className="tm-adm-field">
                <label>ANNOUNCEMENT TEXT</label>
                <input
                  type="text"
                  value={settingsForm.announcementText}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, announcementText: e.target.value })
                  }
                  placeholder="e.g. November Batch — Limited Seats Available"
                />
              </div>

              <div className="tm-adm-field tm-adm-checkbox-wrap">
                <label className="tm-checkbox-label">
                  <input
                    type="checkbox"
                    checked={settingsForm.showSeatCount}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, showSeatCount: e.target.checked })
                    }
                  />
                  <span>Display exact remaining seats on website</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="tm-btn-save-settings"
              disabled={settingsSaving}
            >
              {settingsSaving ? 'Saving...' : 'Update Batch & Seat Count'}
            </button>
          </form>
        </div>

        {/* Filter & Search Bar */}
        <div className="tm-admin-filter-bar">
          <div className="tm-admin-search-wrap">
            <input
              type="text"
              placeholder="Search by name, email, or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="tm-admin-search-input"
            />
          </div>

          <div className="tm-admin-filter-pills">
            {['ALL', 'Both', 'Forex', 'Crypto'].map((opt) => (
              <button
                key={opt}
                type="button"
                className={`tm-admin-filter-btn ${filterInterest === opt ? 'active' : ''}`}
                onClick={() => setFilterInterest(opt)}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="tm-admin-count-badge">
            Total Registrations: <strong>{filteredRegistrations.length}</strong>
          </div>
        </div>

        {/* Registrations Table */}
        <div className="tm-admin-table-container">
          {loading ? (
            <div className="tm-admin-loading">Loading registrations...</div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="tm-admin-empty">No course registrations found.</div>
          ) : (
            <table className="tm-admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student Name</th>
                  <th>Contact Info</th>
                  <th>Experience</th>
                  <th>Interest</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Registered At</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map((r) => (
                  <tr key={r.id}>
                    <td className="tm-td-id">#{r.id}</td>
                    <td className="tm-td-name">
                      <strong>{r.name}</strong>
                    </td>
                    <td className="tm-td-contact">
                      <div>📞 {r.mobile}</div>
                      <div className="tm-td-email">✉ {r.email}</div>
                    </td>
                    <td>
                      <span className="tm-td-pill">{r.trading_experience || 'Beginner'}</span>
                    </td>
                    <td>
                      <span className={`tm-td-pill-interest ${r.interest?.toLowerCase()}`}>
                        {r.interest}
                      </span>
                    </td>
                    <td className="tm-td-ref">{r.reference || 'Website'}</td>
                    <td>
                      <select
                        value={r.status || 'pending'}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        className={`tm-status-select ${r.status}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="tm-td-date">
                      {new Date(r.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
