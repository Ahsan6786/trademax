import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  Plus,
  Send,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  MessageSquare,
  Search,
  Filter,
  X
} from 'lucide-react';
import './StudentTickets.css';

export const StudentTickets = ({ theme = 'dark', user, authToken }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null); // When viewing conversation thread
  const [ticketMessages, setTicketMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [createForm, setCreateForm] = useState({
    subject: '',
    category: 'General Inquiry',
    priority: 'medium',
    message: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const getAuthToken = useCallback(() => {
    return (
      authToken ||
      user?.token ||
      localStorage.getItem('tm_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('tm_auth_token')
    );
  }, [authToken, user?.token]);

  const getAuthHeaders = useCallback(() => {
    const t = getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    };
  }, [getAuthToken]);

  // Fetch tickets for this student
  const fetchMyTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tickets/my-tickets', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchMyTickets();
  }, [fetchMyTickets]);

  // Open ticket thread
  const handleOpenTicket = async (ticketId) => {
    try {
      setLoadingThread(true);
      setThreadError('');
      setActionSuccess('');
      const res = await fetch(`/api/tickets/${ticketId}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.ticket) {
        setActiveTicket(data.ticket);
        setTicketMessages(data.messages || []);
      } else {
        setThreadError(data.error || 'Failed to load ticket thread.');
      }
    } catch (err) {
      console.error('Error fetching ticket details:', err);
      setThreadError('Network error while loading ticket conversation.');
    } finally {
      setLoadingThread(false);
    }
  };

  // Submit new ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!createForm.subject.trim() || createForm.subject.trim().length < 3) {
      setFormError('Please enter a descriptive subject (at least 3 characters).');
      return;
    }
    if (!createForm.message.trim() || createForm.message.trim().length < 5) {
      setFormError('Please describe your issue or query in detail (at least 5 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(createForm),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setIsCreateModalOpen(false);
        setCreateForm({
          subject: '',
          category: 'General Inquiry',
          priority: 'medium',
          message: '',
        });
        await fetchMyTickets();
        if (data.ticket?.id) {
          handleOpenTicket(data.ticket.id);
        }
      } else {
        setFormError(data.error || 'Failed to submit ticket.');
      }
    } catch (err) {
      setFormError('Network error while creating ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    try {
      setIsReplying(true);
      const res = await fetch(`/api/tickets/${activeTicket.id}/reply`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTicketMessages((prev) => [...prev, data.message]);
        setActiveTicket(data.ticket);
        setReplyText('');
        fetchMyTickets();
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setIsReplying(false);
    }
  };

  // Reopen ticket
  const handleReopenTicket = async () => {
    if (!activeTicket) return;
    try {
      const res = await fetch(`/api/tickets/${activeTicket.id}/reopen`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setActiveTicket(data.ticket);
        setActionSuccess('Ticket reopened successfully. Our support desk will follow up.');
        handleOpenTicket(activeTicket.id);
        fetchMyTickets();
      }
    } catch (err) {
      console.error('Error reopening ticket:', err);
    }
  };

  // Close / Resolve ticket
  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    try {
      const res = await fetch(`/api/tickets/${activeTicket.id}/close`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setActiveTicket(data.ticket);
        setActionSuccess('Ticket marked as resolved.');
        handleOpenTicket(activeTicket.id);
        fetchMyTickets();
      }
    } catch (err) {
      console.error('Error resolving ticket:', err);
    }
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className={`tm-student-tickets-root tm-theme-${theme}`}>
      {/* ------------------------------------------------------------------
          VIEW A: TICKET CONVERSATION THREAD
          ------------------------------------------------------------------ */}
      {activeTicket ? (
        <div className="tm-ticket-thread-view">
          {/* Thread Header */}
          <div className="tm-thread-header">
            <div className="tm-thread-header-left">
              <button
                type="button"
                className="tm-btn-thread-back"
                onClick={() => {
                  setActiveTicket(null);
                  fetchMyTickets();
                }}
                aria-label="Back to tickets list"
              >
                <ArrowLeft size={16} />
                <span>All Tickets</span>
              </button>

              <div className="tm-thread-title-wrap">
                <div className="tm-thread-badges-row">
                  <span className="tm-ticket-number-badge">{activeTicket.ticket_number}</span>
                  <span className={`tm-status-pill tm-status-${activeTicket.status}`}>
                    {activeTicket.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`tm-priority-pill tm-priority-${activeTicket.priority}`}>
                    {activeTicket.priority.toUpperCase()} PRIORITY
                  </span>
                  <span className="tm-category-pill">{activeTicket.category}</span>
                </div>
                <h2 className="tm-thread-subject">{activeTicket.subject}</h2>
              </div>
            </div>

            {/* Action buttons (Reopen / Resolve) */}
            <div className="tm-thread-header-actions">
              {activeTicket.status === 'resolved' || activeTicket.status === 'closed' ? (
                <button
                  type="button"
                  className="tm-btn-reopen-ticket"
                  onClick={handleReopenTicket}
                >
                  <RotateCcw size={14} />
                  <span>Reopen Ticket</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="tm-btn-resolve-ticket"
                  onClick={handleCloseTicket}
                >
                  <CheckCircle2 size={14} />
                  <span>Mark as Resolved</span>
                </button>
              )}
            </div>
          </div>

          {actionSuccess && (
            <div className="tm-ticket-alert-success">
              <CheckCircle2 size={15} />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Conversation Messages Container */}
          <div className="tm-thread-messages-box">
            {loadingThread ? (
              <div className="tm-thread-loading">Loading ticket messages...</div>
            ) : (
              ticketMessages.map((msg) => {
                const isAdmin = msg.sender_role === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`tm-ticket-message-card ${isAdmin ? 'admin-response' : 'student-message'}`}
                  >
                    <div className="tm-msg-meta">
                      <span className={`tm-msg-author-badge ${isAdmin ? 'author-admin' : 'author-student'}`}>
                        {isAdmin ? 'TradeMax Support Staff' : 'You (Student)'}
                      </span>
                      <span className="tm-msg-timestamp">
                        {new Date(msg.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="tm-msg-body">{msg.message}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Form */}
          {activeTicket.status !== 'closed' ? (
            <form onSubmit={handleSendReply} className="tm-thread-reply-form">
              <label htmlFor="ticket-reply-input" className="tm-reply-label">
                Reply to Support Desk:
              </label>
              <textarea
                id="ticket-reply-input"
                rows={3}
                placeholder="Type your message or response here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="tm-reply-textarea"
                disabled={isReplying}
              />
              <div className="tm-reply-actions-row">
                <button
                  type="submit"
                  className="tm-btn-send-reply"
                  disabled={isReplying || !replyText.trim()}
                >
                  <Send size={14} />
                  <span>{isReplying ? 'Sending...' : 'Send Reply'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="tm-thread-closed-notice">
              <p>This support ticket is closed. Click &quot;Reopen Ticket&quot; above if you require further assistance.</p>
            </div>
          )}
        </div>
      ) : (
        /* ------------------------------------------------------------------
            VIEW B: TICKETS LISTING & OVERVIEW
            ------------------------------------------------------------------ */
        <div className="tm-tickets-list-view">
          {/* Header Action Row */}
          <div className="tm-tickets-header-row">
            <div>
              <h2 className="tm-tickets-main-title">Student Support &amp; Help Desk</h2>
              <p className="tm-tickets-main-sub">
                Submit queries, track resolution progress, and communicate directly with TradeMax admissions and technical mentors.
              </p>
            </div>

            <button
              type="button"
              className="tm-btn-create-ticket"
              onClick={() => {
                setFormError('');
                setIsCreateModalOpen(true);
              }}
            >
              <Plus size={16} />
              <span>New Support Ticket</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="tm-tickets-filter-bar">
            <div className="tm-search-box">
              <Search size={15} className="tm-search-icon" />
              <input
                type="text"
                placeholder="Search by ticket #, subject, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="tm-ticket-search-input"
              />
            </div>

            <div className="tm-status-tabs">
              {['all', 'open', 'in_progress', 'resolved'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`tm-status-tab-btn ${statusFilter === s ? 'active' : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all' ? 'All' : s.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets Cards Stack */}
          {loading ? (
            <div className="tm-tickets-loading-card">Loading support tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="tm-tickets-empty-card">
              <LifeBuoy size={38} className="tm-empty-icon" />
              <h3>No Support Tickets Found</h3>
              <p>
                {searchQuery || statusFilter !== 'all'
                  ? 'No tickets match your filter criteria. Try clearing search filters.'
                  : 'Have questions about course access, payment verification, live sessions, or trading setups? Create your first ticket.'}
              </p>
              <button
                type="button"
                className="tm-btn-create-ticket"
                style={{ marginTop: '14px' }}
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus size={15} />
                <span>Create Support Ticket</span>
              </button>
            </div>
          ) : (
            <div className="tm-tickets-grid">
              {filteredTickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className="tm-ticket-card"
                  onClick={() => handleOpenTicket(tkt.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="tm-tkt-card-top">
                    <span className="tm-ticket-number-badge">{tkt.ticket_number}</span>
                    <span className={`tm-status-pill tm-status-${tkt.status}`}>
                      {tkt.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <h3 className="tm-tkt-card-title">{tkt.subject}</h3>

                  {tkt.last_message && (
                    <p className="tm-tkt-card-snippet">
                      <strong>{tkt.last_message.sender_role === 'admin' ? 'Support:' : 'You:'}</strong>{' '}
                      {tkt.last_message.message}
                    </p>
                  )}

                  <div className="tm-tkt-card-bottom">
                    <div className="tm-tkt-meta-group">
                      <span className="tm-category-pill">{tkt.category}</span>
                      <span className={`tm-priority-pill tm-priority-${tkt.priority}`}>
                        {tkt.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="tm-tkt-date-group">
                      <MessageSquare size={13} />
                      <span>{tkt.message_count} msgs</span>
                      <span className="tm-dot-sep">•</span>
                      <span>
                        {new Date(tkt.last_reply_at || tkt.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------
          MODAL: CREATE NEW SUPPORT TICKET
          ------------------------------------------------------------------ */}
      {isCreateModalOpen && (
        <div className="tm-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="tm-ticket-create-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="create-ticket-title"
          >
            <div className="tm-modal-header">
              <div className="tm-modal-title-wrap">
                <LifeBuoy size={20} className="tm-modal-icon-red" />
                <h3 id="create-ticket-title">Create Support Ticket</h3>
              </div>
              <button
                type="button"
                className="tm-modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="tm-create-ticket-form">
              {formError && (
                <div className="tm-ticket-alert-error">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="tm-form-field">
                <label htmlFor="ticket-subject-input">
                  Subject / Topic <span className="tm-req">*</span>
                </label>
                <input
                  id="ticket-subject-input"
                  type="text"
                  placeholder="e.g. Question regarding Options Greeks live class"
                  value={createForm.subject}
                  onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                  className="tm-input-clean"
                  required
                />
              </div>

              <div className="tm-form-row-2">
                <div className="tm-form-field">
                  <label htmlFor="ticket-category-select">Category</label>
                  <select
                    id="ticket-category-select"
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="tm-select-clean"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Payment & Verification">Payment &amp; Verification</option>
                    <option value="Course Content & Curriculum">Course Content &amp; Curriculum</option>
                    <option value="Live Class & Schedule">Live Class &amp; Schedule</option>
                    <option value="Technical Support">Technical Support</option>
                  </select>
                </div>

                <div className="tm-form-field">
                  <label htmlFor="ticket-priority-select">Urgency / Priority</label>
                  <select
                    id="ticket-priority-select"
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="tm-select-clean"
                  >
                    <option value="low">Low (General Query)</option>
                    <option value="medium">Medium (Standard Request)</option>
                    <option value="high">High (Class / Access Issue)</option>
                    <option value="urgent">Urgent (Immediate Assistance)</option>
                  </select>
                </div>
              </div>

              <div className="tm-form-field">
                <label htmlFor="ticket-message-textarea">
                  Detailed Description <span className="tm-req">*</span>
                </label>
                <textarea
                  id="ticket-message-textarea"
                  rows={4}
                  placeholder="Explain your issue or question in detail so our support staff can resolve it efficiently..."
                  value={createForm.message}
                  onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                  className="tm-textarea-clean"
                  required
                />
              </div>

              <div className="tm-modal-footer">
                <button
                  type="button"
                  className="tm-btn-modal-cancel"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tm-btn-modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTickets;
