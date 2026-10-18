import webpush from 'web-push';
import { pool } from '../db.js';

// Configure Web Push with VAPID credentials
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admissions@trademax.in';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log('✅ Web Push VAPID initialized successfully');
  } catch (err) {
    console.error('❌ Failed to initialize Web Push VAPID:', err.message);
  }
} else {
  console.warn('⚠️ Web Push VAPID keys not configured in environment variables');
}

/**
 * Returns public VAPID key for frontend registration
 */
export function getVapidPublicKey() {
  return vapidPublicKey;
}

/**
 * Register or update push subscription for a user
 */
export async function saveSubscription(userId, subscription, userAgent = '', preferences = {}) {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    throw new Error('Invalid push subscription format: endpoint and keys (p256dh, auth) are required');
  }

  const {
    notify_motivation = true,
    notify_courses = true,
    notify_live_classes = true,
    notify_announcements = true
  } = preferences;

  const query = `
    INSERT INTO push_subscriptions (
      user_id, endpoint, p256dh, auth, user_agent, is_active,
      notify_motivation, notify_courses, notify_live_classes, notify_announcements,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id = COALESCE(EXCLUDED.user_id, push_subscriptions.user_id),
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      user_agent = EXCLUDED.user_agent,
      is_active = TRUE,
      notify_motivation = EXCLUDED.notify_motivation,
      notify_courses = EXCLUDED.notify_courses,
      notify_live_classes = EXCLUDED.notify_live_classes,
      notify_announcements = EXCLUDED.notify_announcements,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, user_id, endpoint, is_active, notify_motivation, notify_courses, notify_live_classes, notify_announcements;
  `;

  const values = [
    userId || null,
    endpoint,
    keys.p256dh,
    keys.auth,
    userAgent,
    notify_motivation,
    notify_courses,
    notify_live_classes,
    notify_announcements
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Deactivate a subscription (unsubscribe)
 */
export async function unsubscribe(endpoint) {
  if (!endpoint) return null;
  const result = await pool.query(
    'UPDATE push_subscriptions SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE endpoint = $1 RETURNING id',
    [endpoint]
  );
  return result.rows[0] || null;
}

/**
 * Get subscription and preferences for a user
 */
export async function getUserPreferences(userId, endpoint = null) {
  let query = 'SELECT * FROM push_subscriptions WHERE ';
  const values = [];

  if (endpoint) {
    query += 'endpoint = $1';
    values.push(endpoint);
  } else if (userId) {
    query += 'user_id = $1 AND is_active = TRUE ORDER BY updated_at DESC LIMIT 1';
    values.push(userId);
  } else {
    return null;
  }

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

/**
 * Update user notification preferences
 */
export async function updatePreferences(userId, endpoint, prefs = {}) {
  const updates = [];
  const values = [];
  let paramIdx = 1;

  if (typeof prefs.notify_motivation === 'boolean') {
    updates.push(`notify_motivation = $${paramIdx++}`);
    values.push(prefs.notify_motivation);
  }
  if (typeof prefs.notify_courses === 'boolean') {
    updates.push(`notify_courses = $${paramIdx++}`);
    values.push(prefs.notify_courses);
  }
  if (typeof prefs.notify_live_classes === 'boolean') {
    updates.push(`notify_live_classes = $${paramIdx++}`);
    values.push(prefs.notify_live_classes);
  }
  if (typeof prefs.notify_announcements === 'boolean') {
    updates.push(`notify_announcements = $${paramIdx++}`);
    values.push(prefs.notify_announcements);
  }

  if (updates.length === 0) return null;

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  let whereClause = '';
  if (endpoint) {
    whereClause = `endpoint = $${paramIdx++}`;
    values.push(endpoint);
  } else if (userId) {
    whereClause = `user_id = $${paramIdx++}`;
    values.push(userId);
  } else {
    throw new Error('Either endpoint or userId must be provided');
  }

  const query = `
    UPDATE push_subscriptions
    SET ${updates.join(', ')}
    WHERE ${whereClause}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

/**
 * Send a push notification to a single subscription record
 */
export async function sendNotificationToSubscription(subscriptionRow, payload) {
  const pushSubscription = {
    endpoint: subscriptionRow.endpoint,
    keys: {
      p256dh: subscriptionRow.p256dh,
      auth: subscriptionRow.auth
    }
  };

  const notificationPayload = JSON.stringify({
    title: payload.title || 'TradeMax',
    body: payload.body || payload.message || '',
    icon: payload.icon || '/tm-logo.png',
    badge: payload.badge || '/tm-logo.png',
    data: {
      url: payload.url || payload.action_url || '/dashboard',
      timestamp: Date.now()
    }
  });

  try {
    await webpush.sendNotification(pushSubscription, notificationPayload);
    return { success: true };
  } catch (error) {
    // 404 Not Found or 410 Gone means the subscription is expired or revoked
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log(`🧹 Removing expired push subscription ID: ${subscriptionRow.id}`);
      await pool.query('UPDATE push_subscriptions SET is_active = FALSE WHERE id = $1', [subscriptionRow.id]);
    }
    return { success: false, error: error.message, statusCode: error.statusCode };
  }
}

/**
 * Send immediate test push to current admin or specified user
 */
export async function sendTestNotification(userId, testPayload) {
  const result = await pool.query(
    'SELECT * FROM push_subscriptions WHERE user_id = $1 AND is_active = TRUE',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('No active push subscriptions found for this account. Please enable notifications on your browser/device first.');
  }

  const results = [];
  for (const sub of result.rows) {
    const outcome = await sendNotificationToSubscription(sub, {
      title: testPayload.title || '🔔 Test Notification',
      body: testPayload.message || 'This is a test notification from TradeMax Web Push System.',
      icon: testPayload.icon_url || '/tm-logo.png',
      url: testPayload.action_url || '/admin'
    });
    results.push(outcome);
  }

  return results;
}

/**
 * Dispatch an admin campaign to eligible opted-in users
 */
export async function dispatchCampaign(campaignId) {
  const campRes = await pool.query('SELECT * FROM push_campaigns WHERE id = $1', [campaignId]);
  if (campRes.rows.length === 0) throw new Error('Campaign not found');

  const campaign = campRes.rows[0];

  // Determine preference filter based on category
  let prefColumn = 'notify_announcements';
  if (campaign.category === 'motivation') prefColumn = 'notify_motivation';
  else if (campaign.category === 'courses') prefColumn = 'notify_courses';
  else if (campaign.category === 'live_classes') prefColumn = 'notify_live_classes';

  // Build subscriber selection query
  let subQuery = `
    SELECT ps.* 
    FROM push_subscriptions ps
    WHERE ps.is_active = TRUE
      AND ps.${prefColumn} = TRUE
  `;
  const subParams = [];

  if (campaign.target_type === 'course' && campaign.target_course_id) {
    subQuery += `
      AND ps.user_id IN (
        SELECT user_id FROM enrollments 
        WHERE course_id = $1 AND LOWER(enrollment_status) IN ('enrolled', 'completed', 'active')
      )
    `;
    subParams.push(campaign.target_course_id);
  }

  const subRes = await pool.query(subQuery, subParams);
  const subscribers = subRes.rows;

  let sentCount = 0;
  let failureCount = 0;

  for (const sub of subscribers) {
    const outcome = await sendNotificationToSubscription(sub, {
      title: campaign.title,
      body: campaign.message,
      icon: campaign.icon_url,
      url: campaign.action_url
    });

    // Log delivery
    await pool.query(
      `INSERT INTO push_delivery_logs (campaign_id, user_id, status, error_message, delivered_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [campaign.id, sub.user_id, outcome.success ? 'delivered' : 'failed', outcome.error || null]
    );

    if (outcome.success) {
      sentCount++;
    } else {
      failureCount++;
    }
  }

  // Update campaign
  await pool.query(
    `UPDATE push_campaigns 
     SET status = 'sent', sent_count = $1, failure_count = $2, sent_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [sentCount, failureCount, campaign.id]
  );

  return { sentCount, failureCount, totalSubscribers: subscribers.length };
}

/**
 * Send Daily Motivational Quote to all subscribed users
 */
export async function sendDailyMotivationalQuote() {
  try {
    // Pick the least recently sent active quote
    const quoteRes = await pool.query(
      'SELECT * FROM motivational_quotes WHERE is_active = TRUE ORDER BY last_sent_at ASC NULLS FIRST LIMIT 1'
    );

    if (quoteRes.rows.length === 0) {
      console.log('ℹ️ No active motivational quotes found.');
      return { success: false, message: 'No active motivational quotes found.' };
    }

    const quote = quoteRes.rows[0];

    // Find subscribers who opted in for motivation
    const subsRes = await pool.query(
      'SELECT * FROM push_subscriptions WHERE is_active = TRUE AND notify_motivation = TRUE'
    );

    const subscribers = subsRes.rows;
    if (subscribers.length === 0) {
      console.log('ℹ️ No subscribers opted into motivational quotes yet. Advancing quote rotation.');
      await pool.query('UPDATE motivational_quotes SET last_sent_at = CURRENT_TIMESTAMP WHERE id = $1', [quote.id]);

      // Record campaign log entry
      await pool.query(
        `INSERT INTO push_campaigns (title, message, category, target_type, status, schedule_type, sent_count, failure_count, sent_at)
         VALUES ($1, $2, 'motivation', 'all', 'sent', 'immediate', 0, 0, CURRENT_TIMESTAMP)`,
        ['⚡ Daily Trading Discipline', `"${quote.quote}" — ${quote.author || 'TradeMax'}`]
      );

      return {
        success: true,
        quote: quote.quote,
        author: quote.author,
        sent: 0,
        failed: 0,
        message: 'Daily motivation quote rotated successfully. 0 subscribers currently opted in.'
      };
    }

    // Create campaign entry for tracking
    const campRes = await pool.query(
      `INSERT INTO push_campaigns (title, message, category, target_type, status, schedule_type)
       VALUES ($1, $2, 'motivation', 'all', 'processing', 'scheduled')
       RETURNING id`,
      ['⚡ Daily Trading Discipline', `"${quote.quote}" — ${quote.author || 'TradeMax'}`]
    );

    const campaignId = campRes.rows[0].id;

    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      const outcome = await sendNotificationToSubscription(sub, {
        title: '⚡ TradeMax Daily Discipline',
        body: `"${quote.quote}" — ${quote.author || 'TradeMax'}`,
        icon: '/tm-logo.png',
        url: '/dashboard'
      });

      await pool.query(
        `INSERT INTO push_delivery_logs (campaign_id, user_id, status, error_message, delivered_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [campaignId, sub.user_id, outcome.success ? 'delivered' : 'failed', outcome.error || null]
      );

      if (outcome.success) sent++;
      else failed++;
    }

    // Update quote last_sent_at
    await pool.query('UPDATE motivational_quotes SET last_sent_at = CURRENT_TIMESTAMP WHERE id = $1', [quote.id]);

    // Update campaign
    await pool.query(
      `UPDATE push_campaigns 
       SET status = 'sent', sent_count = $1, failure_count = $2, sent_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [sent, failed, campaignId]
    );

    console.log(`✅ Daily Motivation dispatched to ${sent} subscribers (${failed} failed)`);
    return { success: true, quote: quote.quote, author: quote.author, sent, failed };
  } catch (err) {
    console.error('❌ Error sending daily motivation quote:', err.message);
    throw err;
  }
}

/**
 * Background Scheduler for Scheduled Campaigns
 */
let schedulerInterval = null;

export function startPushScheduler() {
  if (schedulerInterval) return;

  console.log('⏱️ Starting Push Notification Scheduler (checks every 60s)...');

  schedulerInterval = setInterval(async () => {
    try {
      // Find campaigns scheduled for now or in the past that are still 'scheduled'
      const dueCampaigns = await pool.query(
        `SELECT id FROM push_campaigns 
         WHERE status = 'scheduled' 
           AND scheduled_for IS NOT NULL 
           AND scheduled_for <= CURRENT_TIMESTAMP
         ORDER BY scheduled_for ASC
         LIMIT 5`
      );

      for (const row of dueCampaigns.rows) {
        console.log(`🚀 Executing scheduled push campaign ID: ${row.id}`);
        await dispatchCampaign(row.id);
      }
    } catch (err) {
      console.error('❌ Push scheduler run error:', err.message);
    }
  }, 60000); // Check once a minute
}
