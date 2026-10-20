import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { adminMiddleware } from '../middleware/admin.js';
import {
  getVapidPublicKey,
  saveSubscription,
  unsubscribe,
  getUserPreferences,
  updatePreferences,
  sendTestNotification,
  dispatchCampaign,
  sendDailyMotivationalQuote
} from '../services/pushService.js';

const router = Router();

// Optional authentication helper: extracts user if token present, but doesn't block if not
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'trademax_jwt_default_secret_key';
      req.user = jwt.verify(token, secret);
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
};

/* ==========================================================================
   PUBLIC & USER PUSH ENDPOINTS
   ========================================================================== */

/**
 * GET /api/push/vapid-key
 * Return the public VAPID key to the browser for subscription registration
 */
router.get('/vapid-key', (req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({
      success: false,
      error: 'Push notifications are not configured on this server.'
    });
  }
  res.json({ success: true, publicKey: key });
});

/**
 * POST /api/push/subscribe
 * Register a user or device push subscription
 */
router.post('/subscribe', optionalAuth, async (req, res) => {
  try {
    const { subscription, preferences } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Push subscription payload is required.'
      });
    }

    const userId = req.user?.id || null;
    const userAgent = req.headers['user-agent'] || '';

    const sub = await saveSubscription(userId, subscription, userAgent, preferences || {});
    res.json({
      success: true,
      message: 'Push subscription activated successfully.',
      subscriptionId: sub.id
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/push/unsubscribe
 * Deactivate a push subscription
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, error: 'Endpoint is required.' });
    }

    await unsubscribe(endpoint);
    res.json({ success: true, message: 'Unsubscribed successfully.' });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/push/preferences
 * Get current notification category preferences for user or endpoint
 */
router.get('/preferences', optionalAuth, async (req, res) => {
  try {
    const endpoint = req.query.endpoint || null;
    const userId = req.user?.id || null;

    if (!endpoint && !userId) {
      return res.json({
        success: true,
        preferences: {
          notify_motivation: true,
          notify_courses: true,
          notify_live_classes: true,
          notify_announcements: true
        }
      });
    }

    const sub = await getUserPreferences(userId, endpoint);
    if (!sub) {
      return res.json({
        success: true,
        preferences: {
          notify_motivation: true,
          notify_courses: true,
          notify_live_classes: true,
          notify_announcements: true
        }
      });
    }

    res.json({
      success: true,
      preferences: {
        notify_motivation: sub.notify_motivation,
        notify_courses: sub.notify_courses,
        notify_live_classes: sub.notify_live_classes,
        notify_announcements: sub.notify_announcements
      }
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/push/preferences
 * Update notification preferences
 */
router.put('/preferences', optionalAuth, async (req, res) => {
  try {
    const { endpoint, preferences } = req.body;
    const userId = req.user?.id || null;

    if (!endpoint && !userId) {
      return res.status(400).json({ success: false, error: 'User or endpoint required.' });
    }

    const updated = await updatePreferences(userId, endpoint, preferences);
    res.json({ success: true, preferences: updated });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ==========================================================================
   ADMIN PUSH NOTIFICATION MANAGEMENT
   ========================================================================== */

/**
 * GET /api/push/admin/stats
 * Overview numbers for the Admin Push Notifications dashboard
 */
router.get('/admin/stats', adminMiddleware, async (req, res) => {
  try {
    // 1. Total Registered Users
    const usersRes = await pool.query('SELECT COUNT(*) as total_users FROM users');

    // 2. Push-Enabled Users (unique users with at least 1 active push device)
    const pushUsersRes = await pool.query(
      'SELECT COUNT(DISTINCT user_id) as push_enabled_users FROM push_subscriptions WHERE is_active = TRUE AND user_id IS NOT NULL'
    );

    // 3. Active Subscriptions & Total device subscriptions
    const subsRes = await pool.query(
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = TRUE) as active FROM push_subscriptions'
    );

    // 4. Delivered and Failed Deliveries from actual delivery audit logs
    const logsRes = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered,
        COUNT(*) FILTER (WHERE status = 'failed') as total_failed
       FROM push_delivery_logs`
    );

    // 5. Total Campaigns
    const campRes = await pool.query(
      `SELECT 
        COUNT(*) as total_campaigns,
        COALESCE(SUM(sent_count), 0) as total_sent,
        COALESCE(SUM(failure_count), 0) as total_failed
       FROM push_campaigns`
    );

    // 6. Motivational Quotes
    const quotesRes = await pool.query(
      'SELECT COUNT(*) as total_quotes, COUNT(*) FILTER (WHERE is_active = TRUE) as active_quotes FROM motivational_quotes'
    );

    const totalRegisteredUsers = parseInt(usersRes.rows[0].total_users, 10);
    const pushEnabledUsers = parseInt(pushUsersRes.rows[0].push_enabled_users, 10);
    const activeSubscriptions = parseInt(subsRes.rows[0].active, 10);
    const deliveredNotifications = Math.max(
      parseInt(logsRes.rows[0].total_delivered, 10),
      parseInt(campRes.rows[0].total_sent, 10)
    );
    const failedDeliveries = Math.max(
      parseInt(logsRes.rows[0].total_failed, 10),
      parseInt(campRes.rows[0].total_failed, 10)
    );

    res.json({
      success: true,
      stats: {
        total_registered_users: totalRegisteredUsers,
        push_enabled_users: pushEnabledUsers,
        active_subscriptions: activeSubscriptions,
        delivered_notifications: deliveredNotifications,
        failed_deliveries: failedDeliveries,
        // Backwards compatibility mappings for existing UI elements
        total_subscribers: parseInt(subsRes.rows[0].total, 10),
        active_subscribers: activeSubscriptions,
        total_campaigns: parseInt(campRes.rows[0].total_campaigns, 10),
        total_notifications_sent: deliveredNotifications,
        total_notifications_failed: failedDeliveries,
        total_quotes: parseInt(quotesRes.rows[0].total_quotes, 10),
        active_quotes: parseInt(quotesRes.rows[0].active_quotes, 10)
      }
    });
  } catch (error) {
    console.error('Error fetching admin push stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/push/admin/campaigns
 * List all campaigns with filters
 */
router.get('/admin/campaigns', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pc.*, u.name as creator_name, c.title as course_title
       FROM push_campaigns pc
       LEFT JOIN users u ON pc.created_by = u.id
       LEFT JOIN courses c ON pc.target_course_id = c.id
       ORDER BY pc.created_at DESC
       LIMIT 50`
    );
    res.json({ success: true, campaigns: result.rows });
  } catch (error) {
    console.error('Error fetching push campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/push/admin/campaigns
 * Create a new notification campaign (Send Immediately or Schedule)
 */
router.post('/admin/campaigns', adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      message,
      category = 'announcements',
      target_type = 'all',
      target_course_id = null,
      icon_url = '/tm-logo.png',
      action_url = '/',
      schedule_type = 'immediate',
      scheduled_for = null
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required.' });
    }

    const status = schedule_type === 'immediate' ? 'processing' : 'scheduled';
    const query = `
      INSERT INTO push_campaigns (
        title, message, category, target_type, target_course_id,
        icon_url, action_url, schedule_type, scheduled_for, status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const values = [
      title.trim(),
      message.trim(),
      category,
      target_type,
      target_course_id || null,
      icon_url || '/tm-logo.png',
      action_url || '/',
      schedule_type,
      scheduled_for ? new Date(scheduled_for) : null,
      status,
      req.user.id
    ];

    const result = await pool.query(query, values);
    const campaign = result.rows[0];

    // If immediate, dispatch right away
    if (schedule_type === 'immediate') {
      const dispatchResult = await dispatchCampaign(campaign.id);
      return res.json({
        success: true,
        message: `Notification dispatched to ${dispatchResult.sentCount} subscribers.`,
        campaign: { ...campaign, ...dispatchResult }
      });
    }

    res.json({
      success: true,
      message: 'Campaign scheduled successfully.',
      campaign
    });
  } catch (error) {
    console.error('Error creating push campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/push/admin/campaigns/:id/send
 * Trigger immediate sending of a draft or scheduled campaign
 */
router.post('/admin/campaigns/:id/send', adminMiddleware, async (req, res) => {
  try {
    const dispatchResult = await dispatchCampaign(req.params.id);
    res.json({
      success: true,
      message: `Notification sent to ${dispatchResult.sentCount} subscribers.`,
      dispatchResult
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/push/admin/campaigns/:id
 * Delete or cancel a campaign
 */
router.delete('/admin/campaigns/:id', adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM push_campaigns WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Campaign deleted successfully.' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/push/admin/test
 * Send a test notification to the current admin's active browser subscription
 */
router.post('/admin/test', adminMiddleware, async (req, res) => {
  try {
    const results = await sendTestNotification(req.user.id, req.body);
    res.json({
      success: true,
      message: 'Test notification sent to your registered browser device.',
      results
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/push/admin/quotes
 * List motivational discipline quotes
 */
router.get('/admin/quotes', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM motivational_quotes ORDER BY is_active DESC, created_at DESC'
    );
    res.json({ success: true, quotes: result.rows });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/push/admin/quotes
 * Add a new motivational discipline quote
 */
router.post('/admin/quotes', adminMiddleware, async (req, res) => {
  try {
    const { quote, author = 'TradeMax Mentor', topic = 'Discipline' } = req.body;
    if (!quote) {
      return res.status(400).json({ success: false, error: 'Quote text is required.' });
    }

    const result = await pool.query(
      `INSERT INTO motivational_quotes (quote, author, topic, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING *`,
      [quote.trim(), author.trim(), topic.trim()]
    );

    res.json({ success: true, quote: result.rows[0] });
  } catch (error) {
    console.error('Error adding quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/push/admin/quotes/:id
 * Update a motivational quote or toggle active state
 */
router.put('/admin/quotes/:id', adminMiddleware, async (req, res) => {
  try {
    const { quote, author, topic, is_active } = req.body;
    const result = await pool.query(
      `UPDATE motivational_quotes 
       SET quote = COALESCE($1, quote),
           author = COALESCE($2, author),
           topic = COALESCE($3, topic),
           is_active = COALESCE($4, is_active)
       WHERE id = $5
       RETURNING *`,
      [quote, author, topic, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Quote not found.' });
    }

    res.json({ success: true, quote: result.rows[0] });
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/push/admin/quotes/:id
 * Delete a motivational quote
 */
router.delete('/admin/quotes/:id', adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM motivational_quotes WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Quote deleted successfully.' });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/push/admin/quotes/send-daily
 * Manually trigger daily motivational quote delivery now
 */
router.post('/admin/quotes/send-daily', adminMiddleware, async (req, res) => {
  try {
    const outcome = await sendDailyMotivationalQuote();
    if (!outcome || !outcome.success) {
      return res.status(400).json({
        success: false,
        error: outcome?.message || 'Unable to send motivational quote. Ensure quotes exist.'
      });
    }

    res.json({
      success: true,
      message: outcome.message || `Daily motivation dispatched to ${outcome.sent} subscribers.`,
      outcome
    });
  } catch (error) {
    console.error('Error triggering daily quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/push/admin/logs
 * Retrieve delivery audit logs
 */
router.get('/admin/logs', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pdl.*, COALESCE(pdl.delivered_at, pdl.created_at) AS delivered_at, pc.title as campaign_title, u.email as user_email
       FROM push_delivery_logs pdl
       LEFT JOIN push_campaigns pc ON pdl.campaign_id = pc.id
       LEFT JOIN users u ON pdl.user_id = u.id
       ORDER BY pdl.id DESC
       LIMIT 100`
    );
    res.json({ success: true, logs: result.rows });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
