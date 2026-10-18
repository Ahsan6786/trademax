import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LifeBuoy,
  Search,
  Filter,
  RefreshCw,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  User,
  Mail,
  Phone,
  ChevronRight,
  X,
  ShieldCheck,
  Check,
  ArrowUpRight,
  FolderOpen
} from 'lucide-react';
import './AdminTickets.css';

export const AdminTickets = ({ showNotification, onStatsUpdate, authToken }) => {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0, urgent: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected Ticket for conversation drawer
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [ticketDetailsLoading, setTicketDetailsLoading] = useState(false);
  const [ticketConversationError, setTicketConversationError] = useState(null);

  // Admin reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);

  const messagesEndRef = useRef(null);

  // Keep stable refs to avoid infinite re-render loops from parent functions
  const onStatsUpdateRef = useRef(onStatsUpdate);
  useEffect(() => {
    onStatsUpdateRef.current = onStatsUpdate;
  }, [onStatsUpdate]);

  const showNotificationRef = useRef(showNotification);
  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  const getAuthHeaders = () => {
    const token =
      authToken ||
      localStorage.getItem('tm_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('tm_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const fetchTickets = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/tickets/admin/all?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch support tickets');
      }

      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
        if (data.stats) {
          setStats(data.stats);
          if (onStatsUpdateRef.current) onStatsUpdateRef.current(data.stats);
        }
      }
    } catch (err) {
      console.error('[AdminTickets] Error loading tickets:', err);
      if (showNotificationRef.current) {
        showNotificationRef.current('Failed to load tickets: ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, search, authToken]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Load ticket conversation
  const loadTicketConversation = async (ticketId) => {
    setSelectedTicketId(ticketId);
    setActiveTicket(null);
    setActiveMessages([]);
    setTicketConversationError(null);
    setTicketDetailsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.ticket) {
        setActiveTicket(data.ticket);
        setActiveMessages(data.messages || []);
      } else {
        throw new Error(data.error || 'Failed to load ticket thread');
      }
    } catch (err) {
      console.error('[AdminTickets] Error loading conversation:', err);
      setTicketConversationError(err.message || 'Failed to load ticket conversation');
      if (showNotificationRef.current) {
        showNotificationRef.current(err.message, 'error');
      }
    } finally {
      setTicketDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (activeMessages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages]);

  // Handle admin reply
  const handleSendReply = async (andResolve = false) => {
    if (!replyMessage.trim() || !activeTicket) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/tickets/admin/${activeTicket.id}/reply`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: replyMessage.trim() })
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send reply');
      }

      setActiveMessages(prev => [...prev, data.message]);
      setActiveTicket(prev => ({
        ...prev,
        ...data.ticket
      }));
      setReplyMessage('');

      if (andResolve) {
        await handleUpdateStatus('resolved');
      } else {
        if (showNotification) {
          showNotification('Reply sent successfully to student.', 'success');
        }
      }

      fetchTickets(true);
    } catch (err) {
      console.error('[AdminTickets] Error sending reply:', err);
      if (showNotification) {
        showNotification(err.message, 'error');
      }
    } finally {
      setSendingReply(false);
    }
  };

  // Handle status update
  const handleUpdateStatus = async (newStatus) => {
    if (!activeTicket) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tickets/admin/${activeTicket.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update ticket status');
      }

      setActiveTicket(prev => ({ ...prev, status: data.ticket.status, resolved_at: data.ticket.resolved_at }));
      if (showNotification) {
        showNotification(`Ticket status updated to ${newStatus.replace('_', ' ').toUpperCase()}`, 'success');
      }
      fetchTickets(true);
    } catch (err) {
      console.error('[AdminTickets] Error updating status:', err);
      if (showNotification) {
        showNotification(err.message, 'error');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle priority update
  const handleUpdatePriority = async (newPriority) => {
    if (!activeTicket) return;
    setUpdatingPriority(true);
    try {
      const res = await fetch(`/api/tickets/admin/${activeTicket.id}/priority`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ priority: newPriority })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update priority');
      }

      setActiveTicket(prev => ({ ...prev, priority: data.ticket.priority }));
      if (showNotification) {
        showNotification(`Ticket priority updated to ${newPriority.toUpperCase()}`, 'success');
      }
      fetchTickets(true);
    } catch (err) {
      console.error('[AdminTickets] Error updating priority:', err);
      if (showNotification) {
        showNotification(err.message, 'error');
      }
    } finally {
      setUpdatingPriority(false);
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'tm-adm-badge-urgent';
      case 'high': return 'tm-adm-badge-high';
      case 'medium': return 'tm-adm-badge-medium';
      case 'low': return 'tm-adm-badge-low';
      default: return 'tm-adm-badge-default';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'tm-adm-status-open';
      case 'in_progress': return 'tm-adm-status-in-progress';
      case 'resolved': return 'tm-adm-status-resolved';
      case 'closed': return 'tm-adm-status-closed';
      default: return 'tm-adm-status-default';
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="tm-admin-tickets-container">
      {/* Header */}
      <div className="tm-admin-tickets-header">
        <div>
          <div className="tm-admin-tickets-title-row">
            <h2 className="tm-admin-tickets-title">Support Ticket Management</h2>
            <span className="tm-admin-badge-count">{stats.total} total</span>
          </div>
          <p className="tm-admin-tickets-subtitle">
            Manage student inquiries, prioritize issues, reply to tickets, and track resolutions.
          </p>
        </div>
        <div className="tm-admin-header-actions">
          <button
            type="button"
            className="tm-admin-btn tm-admin-btn-secondary"
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? 'tm-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="tm-admin-ticket-stats-grid">
        <div className="tm-admin-ticket-stat-card">
          <div className="tm-admin-stat-header">
            <span className="tm-admin-stat-label">Total Tickets</span>
            <LifeBuoy size={18} className="tm-admin-stat-icon-muted" />
          </div>
          <div className="tm-admin-stat-value">{stats.total}</div>
          <div className="tm-admin-stat-desc">All platform requests</div>
        </div>

        <div className="tm-admin-ticket-stat-card tm-stat-card-open">
          <div className="tm-admin-stat-header">
            <span className="tm-admin-stat-label">Needs Review</span>
            <AlertCircle size={18} className="tm-admin-stat-icon-yellow" />
          </div>
          <div className="tm-admin-stat-value">{stats.open}</div>
          <div className="tm-admin-stat-desc">Open student tickets</div>
        </div>

        <div className="tm-admin-ticket-stat-card tm-stat-card-progress">
          <div className="tm-admin-stat-header">
            <span className="tm-admin-stat-label">In Progress</span>
            <Clock size={18} className="tm-admin-stat-icon-blue" />
          </div>
          <div className="tm-admin-stat-value">{stats.in_progress}</div>
          <div className="tm-admin-stat-desc">Actively being handled</div>
        </div>

        <div className="tm-admin-ticket-stat-card tm-stat-card-resolved">
          <div className="tm-admin-stat-header">
            <span className="tm-admin-stat-label">Resolved</span>
            <CheckCircle size={18} className="tm-admin-stat-icon-green" />
          </div>
          <div className="tm-admin-stat-value">{stats.resolved}</div>
          <div className="tm-admin-stat-desc">Completed inquiries</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="tm-admin-ticket-filter-bar">
        <div className="tm-admin-ticket-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by ticket #, subject, student name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="tm-admin-clear-search-btn"
              onClick={() => setSearch('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="tm-admin-ticket-filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="tm-admin-filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="tm-admin-filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="tm-admin-filter-select"
          >
            <option value="all">All Categories</option>
            <option value="Course Access">Course Access</option>
            <option value="Technical Issue">Technical Issue</option>
            <option value="Billing & Payments">Billing & Payments</option>
            <option value="Live Classes">Live Classes</option>
            <option value="General Inquiry">General Inquiry</option>
          </select>

          {(statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || search) && (
            <button
              type="button"
              className="tm-admin-btn-reset-filters"
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setCategoryFilter('all');
                setSearch('');
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tickets List / Table */}
      <div className="tm-admin-tickets-table-card">
        {loading ? (
          <div className="tm-admin-tickets-loading">
            <RefreshCw size={24} className="tm-spin" />
            <p>Loading support tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="tm-admin-tickets-empty">
            <FolderOpen size={40} />
            <h3>No Support Tickets Found</h3>
            <p>There are no support tickets matching your current search or filter criteria.</p>
          </div>
        ) : (
          <div className="tm-admin-table-responsive">
            <table className="tm-admin-tickets-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Student</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Messages</th>
                  <th>Last Update</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((tkt) => (
                  <tr
                    key={tkt.id}
                    className={selectedTicketId === tkt.id ? 'tm-row-selected' : ''}
                    onClick={() => loadTicketConversation(tkt.id)}
                  >
                    <td>
                      <div className="tm-tkt-id-col">
                        <span className="tm-tkt-num">{tkt.ticket_number}</span>
                        <div className="tm-tkt-subject-line" title={tkt.subject}>
                          {tkt.subject}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="tm-tkt-student-col">
                        <span className="tm-tkt-student-name">{tkt.student_name || 'Student'}</span>
                        <span className="tm-tkt-student-email">{tkt.student_email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="tm-tkt-cat-badge">{tkt.category}</span>
                    </td>
                    <td>
                      <span className={`tm-adm-badge ${getPriorityBadgeClass(tkt.priority)}`}>
                        {tkt.priority?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`tm-adm-status-badge ${getStatusBadgeClass(tkt.status)}`}>
                        {tkt.status === 'in_progress' ? 'IN PROGRESS' : tkt.status?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className="tm-tkt-msg-count">
                        <MessageSquare size={13} />
                        {tkt.message_count || 1}
                      </span>
                    </td>
                    <td>
                      <span className="tm-tkt-time-col">
                        {formatDateTime(tkt.last_reply_at || tkt.created_at)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="tm-admin-view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadTicketConversation(tkt.id);
                        }}
                      >
                        <span>Open</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TICKET DETAILS & CONVERSATION MODAL / DRAWER */}
      {selectedTicketId && (
        <div className="tm-admin-modal-overlay" onClick={() => setSelectedTicketId(null)}>
          <div
            className="tm-admin-modal tm-admin-ticket-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {ticketDetailsLoading ? (
              <div className="tm-admin-modal-loading">
                <RefreshCw size={28} className="tm-spin" />
                <p>Loading ticket conversation...</p>
              </div>
            ) : ticketConversationError ? (
              <div className="tm-admin-modal-loading" style={{ gap: 12 }}>
                <AlertCircle size={32} style={{ color: '#EF4444' }} />
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Unable to Load Conversation</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{ticketConversationError}</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="tm-admin-btn tm-admin-btn-secondary"
                    onClick={() => setSelectedTicketId(null)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="tm-admin-btn tm-admin-btn-primary"
                    onClick={() => loadTicketConversation(selectedTicketId)}
                  >
                    <RefreshCw size={14} />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            ) : activeTicket ? (
              <>
                {/* Modal Header */}
                <div className="tm-admin-modal-header">
                  <div className="tm-ticket-modal-title-area">
                    <div className="tm-ticket-meta-pills">
                      <span className="tm-ticket-pill-id">{activeTicket.ticket_number}</span>
                      <span className="tm-ticket-pill-cat">{activeTicket.category}</span>
                    </div>
                    <h3 className="tm-ticket-modal-subject">{activeTicket.subject}</h3>
                  </div>
                  <button
                    type="button"
                    className="tm-admin-modal-close"
                    onClick={() => setSelectedTicketId(null)}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Controls Bar: Priority & Status Change */}
                <div className="tm-ticket-controls-bar">
                  <div className="tm-ticket-control-item">
                    <label>Priority:</label>
                    <select
                      value={activeTicket.priority}
                      onChange={(e) => handleUpdatePriority(e.target.value)}
                      disabled={updatingPriority}
                      className={`tm-ticket-control-select ${getPriorityBadgeClass(activeTicket.priority)}`}
                    >
                      <option value="low">LOW</option>
                      <option value="medium">MEDIUM</option>
                      <option value="high">HIGH</option>
                      <option value="urgent">URGENT</option>
                    </select>
                  </div>

                  <div className="tm-ticket-control-item">
                    <label>Status:</label>
                    <select
                      value={activeTicket.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      disabled={updatingStatus}
                      className={`tm-ticket-control-select ${getStatusBadgeClass(activeTicket.status)}`}
                    >
                      <option value="open">OPEN</option>
                      <option value="in_progress">IN PROGRESS</option>
                      <option value="resolved">RESOLVED</option>
                      <option value="closed">CLOSED</option>
                    </select>
                  </div>

                  <div className="tm-ticket-student-info-strip">
                    <User size={13} />
                    <span>{activeTicket.student_name || activeTicket.user_name || 'Student'}</span>
                    <Mail size={13} style={{ marginLeft: 6 }} />
                    <span>{activeTicket.student_email || activeTicket.user_email || 'No email'}</span>
                    {(activeTicket.student_mobile || activeTicket.user_mobile) && (
                      <>
                        <Phone size={13} style={{ marginLeft: 6 }} />
                        <span>{activeTicket.student_mobile || activeTicket.user_mobile}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Conversation Body */}
                <div className="tm-admin-ticket-convo-body">
                  <div className="tm-convo-messages-list">
                    {activeMessages.map((msg, index) => {
                      const isAdmin = msg.sender_role === 'admin';
                      return (
                        <div
                          key={msg.id || index}
                          className={`tm-convo-bubble-wrap ${isAdmin ? 'tm-bubble-admin' : 'tm-bubble-student'}`}
                        >
                          <div className="tm-convo-bubble-header">
                            <span className="tm-convo-sender-name">
                              {isAdmin ? 'TradeMax Support' : (msg.sender_name || 'Student')}
                            </span>
                            <span className={`tm-convo-role-tag ${isAdmin ? 'tm-tag-admin' : 'tm-tag-student'}`}>
                              {isAdmin ? 'ADMINISTRATOR' : 'STUDENT'}
                            </span>
                            <span className="tm-convo-time">
                              {formatDateTime(msg.created_at)}
                            </span>
                          </div>
                          <div className="tm-convo-bubble-text">
                            {msg.message}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Reply Composer */}
                <div className="tm-admin-ticket-reply-box">
                  <textarea
                    rows={3}
                    placeholder="Type official response to student..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    disabled={sendingReply}
                  />
                  <div className="tm-admin-reply-actions">
                    <div className="tm-admin-quick-note">
                      <span>Responding as: <strong>TradeMax Support Team</strong></span>
                    </div>
                    <div className="tm-reply-btn-group">
                      <button
                        type="button"
                        className="tm-admin-btn tm-admin-btn-secondary"
                        onClick={() => handleSendReply(true)}
                        disabled={sendingReply || !replyMessage.trim()}
                      >
                        <Check size={14} />
                        <span>Send &amp; Mark Resolved</span>
                      </button>
                      <button
                        type="button"
                        className="tm-admin-btn tm-admin-btn-primary"
                        onClick={() => handleSendReply(false)}
                        disabled={sendingReply || !replyMessage.trim()}
                      >
                        <Send size={14} />
                        <span>{sendingReply ? 'Sending...' : 'Send Reply'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
