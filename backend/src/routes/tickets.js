import { Router } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

export const ticketsRouter = Router();

// Helper to generate unique ticket numbers (e.g. TKT-108421)
const generateTicketNumber = async () => {
  for (let i = 0; i < 5; i++) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const candidate = `TKT-${randomDigits}`;
    const check = await pool.query('SELECT id FROM support_tickets WHERE ticket_number = $1', [candidate]);
    if (check.rows.length === 0) {
      return candidate;
    }
  }
  return `TKT-${Date.now().toString().slice(-6)}`;
};

/* ==========================================================================
   STUDENT / USER TICKETS ENDPOINTS (authMiddleware)
   ========================================================================== */

/**
 * GET /api/tickets/my-tickets
 * Get all support tickets created by the authenticated user
 */
ticketsRouter.get('/my-tickets', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT 
        t.id,
        t.ticket_number,
        t.subject,
        t.category,
        t.priority,
        t.status,
        t.resolved_at,
        t.last_reply_at,
        t.created_at,
        t.updated_at,
        COUNT(m.id)::int AS message_count,
        (
          SELECT json_build_object(
            'message', lm.message,
            'sender_role', lm.sender_role,
            'created_at', lm.created_at
          )
          FROM ticket_messages lm
          WHERE lm.ticket_id = t.id
          ORDER BY lm.created_at DESC
          LIMIT 1
        ) AS last_message
      FROM support_tickets t
      LEFT JOIN ticket_messages m ON m.ticket_id = t.id
      WHERE t.user_id = $1
      GROUP BY t.id
      ORDER BY t.last_reply_at DESC, t.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      tickets: result.rows,
    });
  } catch (err) {
    console.error('[Tickets] Error fetching user tickets:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch tickets.' });
  }
});

/**
 * POST /api/tickets
 * Create a new support ticket with initial message
 */
ticketsRouter.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { subject, category = 'General Inquiry', priority = 'medium', message } = req.body;

    if (!subject || !subject.trim() || subject.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Ticket subject is required (minimum 3 characters).',
      });
    }

    if (!message || !message.trim() || message.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a detailed description of your issue (minimum 5 characters).',
      });
    }

    const cleanCategory = String(category).trim().slice(0, 100);
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const cleanPriority = validPriorities.includes(String(priority).toLowerCase())
      ? String(priority).toLowerCase()
      : 'medium';

    await client.query('BEGIN');

    const ticketNumber = await generateTicketNumber();

    const ticketRes = await client.query(
      `INSERT INTO support_tickets (
        ticket_number, user_id, subject, category, priority, status, created_at, updated_at, last_reply_at
      ) VALUES ($1, $2, $3, $4, $5, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [ticketNumber, userId, subject.trim(), cleanCategory, cleanPriority]
    );

    const ticket = ticketRes.rows[0];

    const messageRes = await client.query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_id, sender_role, message, created_at
      ) VALUES ($1, $2, 'student', $3, CURRENT_TIMESTAMP)
      RETURNING *`,
      [ticket.id, userId, message.trim()]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      ticket: {
        ...ticket,
        messages: [messageRes.rows[0]],
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Tickets] Error creating support ticket:', err);
    res.status(500).json({ success: false, error: 'Failed to create support ticket.' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/tickets/:id
 * Retrieve a specific ticket and its full conversation thread
 */
ticketsRouter.get('/:id', authMiddleware, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket ID.' });
    }

    const ticketRes = await pool.query(
      `SELECT 
        t.*,
        COALESCE(u.name, 'Student') AS student_name,
        COALESCE(u.email, 'N/A') AS student_email,
        COALESCE(u.mobile, 'N/A') AS student_mobile,
        COALESCE(u.name, 'Student') AS user_name,
        COALESCE(u.email, 'N/A') AS user_email,
        COALESCE(u.mobile, 'N/A') AS user_mobile
      FROM support_tickets t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.id = $1`,
      [ticketId]
    );

    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const ticket = ticketRes.rows[0];

    // RBAC: Students can only view their own tickets
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to view this ticket.',
      });
    }

    const messagesRes = await pool.query(
      `SELECT 
        m.id,
        m.ticket_id,
        m.sender_id,
        m.sender_role,
        m.message,
        m.created_at,
        COALESCE(u.name, CASE WHEN m.sender_role = 'admin' THEN 'TradeMax Support' ELSE 'Student' END) AS sender_name,
        COALESCE(u.email, '') AS sender_email
      FROM ticket_messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.ticket_id = $1
      ORDER BY m.created_at ASC`,
      [ticketId]
    );

    res.json({
      success: true,
      ticket,
      messages: messagesRes.rows,
    });
  } catch (err) {
    console.error('[Tickets] Error fetching ticket conversation:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch ticket conversation.' });
  }
});

/**
 * POST /api/tickets/:id/reply
 * Reply to a ticket as student (or admin)
 */
ticketsRouter.post('/:id/reply', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const ticketId = parseInt(req.params.id, 10);
    const { message } = req.body;

    if (isNaN(ticketId)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket ID.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Reply message cannot be empty.' });
    }

    const ticketRes = await client.query('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const ticket = ticketRes.rows[0];
    const isStudent = req.user.role !== 'admin';

    // Student permission check
    if (isStudent && ticket.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only reply to your own tickets.',
      });
    }

    await client.query('BEGIN');

    const senderRole = isStudent ? 'student' : 'admin';

    const msgRes = await client.query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_id, sender_role, message, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *`,
      [ticketId, req.user.id, senderRole, message.trim()]
    );

    // If student replies to a resolved/closed ticket, automatically reopen it to 'open'
    let nextStatus = ticket.status;
    let resolvedAt = ticket.resolved_at;

    if (isStudent && (ticket.status === 'resolved' || ticket.status === 'closed')) {
      nextStatus = 'open';
      resolvedAt = null;
    } else if (!isStudent && ticket.status === 'open') {
      nextStatus = 'in_progress';
    }

    const updatedTicketRes = await client.query(
      `UPDATE support_tickets
       SET status = $1, resolved_at = $2, last_reply_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [nextStatus, resolvedAt, ticketId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: {
        ...msgRes.rows[0],
        sender_name: req.user.name || (isStudent ? 'Student' : 'TradeMax Support'),
        sender_email: req.user.email,
      },
      ticket: updatedTicketRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Tickets] Error replying to ticket:', err);
    res.status(500).json({ success: false, error: 'Failed to post reply.' });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/tickets/:id/reopen
 * Reopen a resolved or closed ticket
 */
ticketsRouter.patch('/:id/reopen', authMiddleware, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket ID.' });
    }

    const ticketRes = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const ticket = ticketRes.rows[0];

    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only reopen your own tickets.',
      });
    }

    const updatedRes = await pool.query(
      `UPDATE support_tickets
       SET status = 'open', resolved_at = NULL, updated_at = CURRENT_TIMESTAMP, last_reply_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [ticketId]
    );

    // Add automated audit message
    await pool.query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_id, sender_role, message, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        ticketId,
        req.user.id,
        req.user.role === 'admin' ? 'admin' : 'student',
        `Ticket reopened by ${req.user.role === 'admin' ? 'Administrator' : 'Student'}.`,
      ]
    );

    res.json({
      success: true,
      ticket: updatedRes.rows[0],
    });
  } catch (err) {
    console.error('[Tickets] Error reopening ticket:', err);
    res.status(500).json({ success: false, error: 'Failed to reopen ticket.' });
  }
});

/**
 * PATCH /api/tickets/:id/close
 * Student closes/resolves their own ticket
 */
ticketsRouter.patch('/:id/close', authMiddleware, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket ID.' });
    }

    const ticketRes = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const ticket = ticketRes.rows[0];

    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.',
      });
    }

    const updatedRes = await pool.query(
      `UPDATE support_tickets
       SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [ticketId]
    );

    await pool.query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_id, sender_role, message, created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        ticketId,
        req.user.id,
        req.user.role === 'admin' ? 'admin' : 'student',
        'Ticket marked as resolved.',
      ]
    );

    res.json({
      success: true,
      ticket: updatedRes.rows[0],
    });
  } catch (err) {
    console.error('[Tickets] Error closing ticket:', err);
    res.status(500).json({ success: false, error: 'Failed to resolve ticket.' });
  }
});

/* ==========================================================================
   ADMINISTRATOR TICKETS MANAGEMENT ENDPOINTS (adminMiddleware)
   ========================================================================== */

/**
 * GET /api/tickets/admin/all
 * View all tickets with filtering, search, and summary metrics
 */
ticketsRouter.get('/admin/all', adminMiddleware, async (req, res) => {
  try {
    const { status, priority, category, search } = req.query;

    let query = `
      SELECT 
        t.id,
        t.ticket_number,
        t.user_id,
        t.subject,
        t.category,
        t.priority,
        t.status,
        t.resolved_at,
        t.last_reply_at,
        t.created_at,
        t.updated_at,
        u.name AS student_name,
        u.email AS student_email,
        u.mobile AS student_mobile,
        COUNT(m.id)::int AS message_count,
        (
          SELECT json_build_object(
            'message', lm.message,
            'sender_role', lm.sender_role,
            'created_at', lm.created_at
          )
          FROM ticket_messages lm
          WHERE lm.ticket_id = t.id
          ORDER BY lm.created_at DESC
          LIMIT 1
        ) AS last_message
      FROM support_tickets t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN ticket_messages m ON m.ticket_id = t.id
      WHERE 1=1
    `;

    const params = [];

    if (status && status !== 'all') {
      params.push(status.toLowerCase());
      query += ` AND t.status = $${params.length}`;
    }

    if (priority && priority !== 'all') {
      params.push(priority.toLowerCase());
      query += ` AND t.priority = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      query += ` AND t.category = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(t.ticket_number) LIKE $${params.length} OR
        LOWER(t.subject) LIKE $${params.length} OR
        LOWER(u.name) LIKE $${params.length} OR
        LOWER(u.email) LIKE $${params.length}
      )`;
    }

    query += ` GROUP BY t.id, u.name, u.email, u.mobile ORDER BY t.last_reply_at DESC, t.created_at DESC`;

    const ticketsRes = await pool.query(query, params);

    // Summary statistics
    const statsRes = await pool.query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::int AS resolved,
        COUNT(*) FILTER (WHERE priority = 'urgent' AND status != 'resolved')::int AS urgent
      FROM support_tickets
    `);

    res.json({
      success: true,
      tickets: ticketsRes.rows,
      stats: statsRes.rows[0] || { total: 0, open: 0, in_progress: 0, resolved: 0, urgent: 0 },
    });
  } catch (err) {
    console.error('[Tickets Admin] Error fetching all tickets:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch tickets.' });
  }
});

/**
 * PATCH /api/tickets/admin/:id/status
 * Update ticket status (open, in_progress, resolved, closed)
 */
ticketsRouter.patch('/admin/:id/status', adminMiddleware, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (isNaN(ticketId)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket ID.' });
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const cleanStatus = status.toLowerCase();
    const resolvedAt = cleanStatus === 'resolved' || cleanStatus === 'closed' ? 'CURRENT_TIMESTAMP' : 'NULL';

    const updateRes = await pool.query(
      `UPDATE support_tickets
       SET status = $1, 
           resolved_at = ${resolvedAt === 'NULL' ? 'NULL' : 'CURRENT_TIMESTAMP'}, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [cleanStatus, ticketId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    // Add status change audit log
    await pool.query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_id, sender_role, message, created_at
      ) VALUES ($1, $2, 'admin', $3, CURRENT_TIMESTAMP)`,
      [
        ticketId,
        req.user.id,
        `Ticket status updated to "${cleanStatus.replace('_', ' ').toUpperCase()}" by Administrator.`,
      ]
    );

    res.json({
      success: true,
      ticket: updateRes.rows[0],
    });
  } catch (err) {
    console.error('[Tickets Admin] Error updating status:', err);
    res.status(500).json({ success: false, error: 'Failed to update ticket status.' });
  }
});

/**
 * PATCH /api/tickets/admin/:id/priority
 * Update ticket priority (low, medium, high, urgent)
 */
ticketsRouter.patch('/admin/:id/priority', adminMiddleware, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const { priority } = req.body;

    if (isNaN(ticketId)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket ID.' });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!priority || !validPriorities.includes(priority.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
      });
    }

    const updateRes = await pool.query(
      `UPDATE support_tickets
       SET priority = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [priority.toLowerCase(), ticketId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    res.json({
      success: true,
      ticket: updateRes.rows[0],
    });
  } catch (err) {
    console.error('[Tickets Admin] Error updating priority:', err);
    res.status(500).json({ success: false, error: 'Failed to update ticket priority.' });
  }
});

/**
 * POST /api/tickets/admin/:id/reply
 * Admin responds to ticket and optionally updates status
 */
ticketsRouter.post('/admin/:id/reply', adminMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const ticketId = parseInt(req.params.id, 10);
    const { message, new_status } = req.body;

    if (isNaN(ticketId)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket ID.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Reply message cannot be empty.' });
    }

    const ticketRes = await client.query('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const ticket = ticketRes.rows[0];

    await client.query('BEGIN');

    const msgRes = await client.query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_id, sender_role, message, created_at
      ) VALUES ($1, $2, 'admin', $3, CURRENT_TIMESTAMP)
      RETURNING *`,
      [ticketId, req.user.id, message.trim()]
    );

    // Determine target status
    let statusToSet = new_status || (ticket.status === 'open' ? 'in_progress' : ticket.status);
    let resolvedAt = ticket.resolved_at;
    if (statusToSet === 'resolved' || statusToSet === 'closed') {
      resolvedAt = new Date();
    }

    const updatedTicketRes = await client.query(
      `UPDATE support_tickets
       SET status = $1, resolved_at = $2, last_reply_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [statusToSet, resolvedAt, ticketId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: {
        ...msgRes.rows[0],
        sender_name: req.user.name || 'TradeMax Support Administrator',
        sender_email: req.user.email,
      },
      ticket: updatedTicketRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Tickets Admin] Error posting admin reply:', err);
    res.status(500).json({ success: false, error: 'Failed to post admin reply.' });
  } finally {
    client.release();
  }
});

export default ticketsRouter;
