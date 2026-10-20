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
 * Automatically recover campaigns stuck in 'processing' due to server restart or timeout
 */
export async function recoverStuckCampaigns() {
  try {
    const res = await pool.query(
      `UPDATE push_campaigns
       SET status = 'failed'
       WHERE status = 'processing'
         AND (
           (created_at < NOW() - INTERVAL '5 minutes' AND sent_at IS NULL)
           OR sent_at < NOW() - INTERVAL '5 minutes'
         )
       RETURNING id, title`
    );
    if (res.rows.length > 0) {
      console.log(`🧹 Auto-recovered ${res.rows.length} stuck push campaign(s):`, res.rows.map((r) => r.id));
    }
  } catch (err) {
    console.warn('⚠️ Warning during stuck push campaign recovery:', err.message);
  }
}

/**
 * Dispatch an admin campaign to eligible opted-in users
 */
export async function dispatchCampaign(campaignId) {
  const campRes = await pool.query('SELECT * FROM push_campaigns WHERE id = $1', [campaignId]);
  if (campRes.rows.length === 0) throw new Error('Campaign not found');

  const campaign = campRes.rows[0];

  // Immediately mark status as 'processing' with timestamp
  await pool.query(
    "UPDATE push_campaigns SET status = 'processing', sent_at = CURRENT_TIMESTAMP WHERE id = $1",
    [campaignId]
  );

  try {
    // Determine preference filter based on category
    let prefColumn = null;
    if (campaign.category === 'motivation') prefColumn = 'notify_motivation';
    else if (campaign.category === 'courses') prefColumn = 'notify_courses';
    else if (campaign.category === 'live_classes') prefColumn = 'notify_live_classes';
    else if (campaign.category === 'announcements') prefColumn = 'notify_announcements';

    // Build subscriber selection query for all active subscriptions
    let subQuery = `
      SELECT ps.* 
      FROM push_subscriptions ps
      WHERE ps.is_active = TRUE
    `;
    if (prefColumn) {
      subQuery += ` AND ps.${prefColumn} = TRUE`;
    }

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
        icon: campaign.icon_url || '/tm-logo.png',
        url: campaign.action_url || '/#dashboard'
      });

      // Log delivery attempt
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

    // Determine final status: if 0 subscribers, mark 'sent' so it doesn't get stuck
    const finalStatus = subscribers.length === 0 ? 'sent' : (sentCount > 0 ? 'sent' : 'failed');

    await pool.query(
      `UPDATE push_campaigns 
       SET status = $1, sent_count = $2, failure_count = $3, sent_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [finalStatus, sentCount, failureCount, campaign.id]
    );

    return { sentCount, failureCount, totalSubscribers: subscribers.length };
  } catch (err) {
    console.error(`❌ Campaign ${campaignId} dispatch error:`, err.message);
    await pool.query(
      "UPDATE push_campaigns SET status = 'failed', sent_at = CURRENT_TIMESTAMP WHERE id = $1",
      [campaignId]
    );
    throw err;
  }
}

/**
 * Returns date and hour breakdown in Asia/Kolkata timezone
 */
export function getKolkataTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
    dateStr: `${map.year}-${map.month}-${map.day}`,
    hourStr: map.hour
  };
}

/**
 * Send Trading Motivation quote to all subscribed users
 * Optionally guarded by idempotencyKey to prevent duplicate execution
 */
export async function sendDailyMotivationalQuote(options = {}) {
  const { idempotencyKey = null, scheduledSlot = null } = options;

  try {
    // 1. Check idempotency if scheduled
    if (idempotencyKey) {
      const existing = await pool.query(
        'SELECT id, status FROM push_campaigns WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      if (existing.rows.length > 0) {
        return {
          success: true,
          duplicateSkipped: true,
          message: `Scheduled motivation for slot ${idempotencyKey} has already executed.`
        };
      }
    }

    // 2. Pick least recently sent active quote to avoid repeating consecutively
    const quoteRes = await pool.query(
      'SELECT * FROM motivational_quotes WHERE is_active = TRUE ORDER BY last_sent_at ASC NULLS FIRST, id ASC LIMIT 1'
    );

    if (quoteRes.rows.length === 0) {
      console.warn('ℹ️ No active motivational quotes found in database.');
      return { success: false, message: 'No active motivational quotes found in database.' };
    }

    const quote = quoteRes.rows[0];
    const title = 'TradeMax Trading Motivation';
    const message = `"${quote.quote}" — ${quote.author || 'Patil Trader'}`;

    // 3. Create a unique campaign record for this notification
    const campRes = await pool.query(
      `INSERT INTO push_campaigns (
        title, message, category, target_type, status, schedule_type, idempotency_key, action_url, icon_url
      ) VALUES ($1, $2, 'motivation', 'all', 'processing', $3, $4, '/#dashboard', '/tm-logo.png')
      RETURNING id`,
      [title, message, scheduledSlot ? 'scheduled' : 'immediate', idempotencyKey]
    );

    const campaignId = campRes.rows[0].id;

    // 4. Dispatch the campaign to all eligible opted-in subscribers
    const dispatchResult = await dispatchCampaign(campaignId);

    // 5. Update quote last_sent_at for round-robin rotation
    await pool.query('UPDATE motivational_quotes SET last_sent_at = CURRENT_TIMESTAMP WHERE id = $1', [quote.id]);

    console.log(`✅ [Trading Motivation] Dispatched campaign ${campaignId} to ${dispatchResult.sentCount} subscribers (${dispatchResult.failureCount} failed)`);
    return {
      success: true,
      campaignId,
      quote: quote.quote,
      author: quote.author,
      ...dispatchResult
    };
  } catch (err) {
    console.error('❌ Error executing sendDailyMotivationalQuote:', err.message);
    throw err;
  }
}

/**
 * Check and trigger Automated Trading Motivation every 6 hours in Asia/Kolkata
 * Target IST times: 9:00 AM, 3:00 PM, 9:00 PM, 3:00 AM
 */
export async function checkAndRunScheduledMotivation() {
  try {
    const kt = getKolkataTime();
    // 3:00 AM (03), 9:00 AM (09), 3:00 PM (15), 9:00 PM (21)
    const targetHours = [3, 9, 15, 21];

    if (!targetHours.includes(kt.hour)) {
      return;
    }

    const slotKey = `motivation_ist_${kt.dateStr}_${String(kt.hour).padStart(2, '0')}`;

    // Verify if this slot has already executed today
    const existing = await pool.query(
      'SELECT id, status FROM push_campaigns WHERE idempotency_key = $1',
      [slotKey]
    );

    if (existing.rows.length > 0) {
      return; // Already executed for this slot
    }

    console.log(`⏰ [Push Scheduler] Executing 6-hour Trading Motivation for Asia/Kolkata slot: ${slotKey} (IST ${kt.hour}:00)`);
    await sendDailyMotivationalQuote({
      idempotencyKey: slotKey,
      scheduledSlot: `${kt.hour}:00 IST`
    });
  } catch (err) {
    console.error('❌ Error in checkAndRunScheduledMotivation:', err.message);
  }
}

/**
 * Background Scheduler for Scheduled Campaigns & Automated 6-Hour Motivation
 */
let schedulerInterval = null;

export function startPushScheduler() {
  if (schedulerInterval) return;

  console.log('⏱️ Starting Push Notification Scheduler (checks every 30s in Asia/Kolkata)...');

  // Initial recovery of any leftover stuck campaigns
  recoverStuckCampaigns().catch((err) => console.warn('Initial campaign recovery error:', err.message));

  // Run initial motivation slot check on startup
  checkAndRunScheduledMotivation().catch((err) => console.warn('Initial motivation check error:', err.message));

  schedulerInterval = setInterval(async () => {
    try {
      // 1. Recover any stale processing campaigns
      await recoverStuckCampaigns();

      // 2. Check and run 6-hour automated trading motivation (9 AM, 3 PM, 9 PM, 3 AM IST)
      await checkAndRunScheduledMotivation();

      // 3. Find admin-created campaigns scheduled for now or in the past that are still 'scheduled'
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
  }, 30000); // Check every 30 seconds
}

