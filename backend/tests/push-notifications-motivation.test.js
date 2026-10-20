import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db.js';
import {
  getKolkataTime,
  recoverStuckCampaigns
} from '../src/services/pushService.js';

describe('TradeMax Push Notifications & Motivation Automation Tests', () => {
  let adminToken;

  after(async () => {
    await pool.end();
  });

  before(async () => {
    // 1. Ensure admin account is accessible
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@trademaxclub.in', password: 'TradeMax@2026' })
    });
    const data = await loginRes.json();
    adminToken = data.token;
    assert.ok(adminToken, 'Admin should be able to log in');
  });

  test('1. Accurate Real-Time Push Statistics', async () => {
    const res = await fetch('http://localhost:5001/api/push/admin/stats', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    
    // Verify all 5 requested metrics are returned as numbers
    assert.equal(typeof body.stats.total_registered_users, 'number');
    assert.equal(typeof body.stats.push_enabled_users, 'number');
    assert.equal(typeof body.stats.active_subscriptions, 'number');
    assert.equal(typeof body.stats.delivered_notifications, 'number');
    assert.equal(typeof body.stats.failed_deliveries, 'number');

    // Verify consistency with direct DB counts
    const dbUsers = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    assert.equal(body.stats.total_registered_users, dbUsers.rows[0].count);
  });

  test('2. Timezone & 6-Hour Schedule Slot Detection (Asia/Kolkata)', () => {
    const kolkata = getKolkataTime();
    assert.ok(kolkata.year >= 2026, 'Year in Kolkata should be current/valid');
    assert.ok(kolkata.hour >= 0 && kolkata.hour <= 23, 'Hour should be 0-23');
    assert.ok(kolkata.minute >= 0 && kolkata.minute <= 59, 'Minute should be 0-59');
    assert.equal(kolkata.dateStr.length, 10, 'dateStr should be YYYY-MM-DD');
  });

  test('3. Idempotency Key Prevents Duplicate Scheduled Motivation Runs', async () => {
    const testKey = `test_idemp_${Date.now()}`;
    
    // Insert initial campaign with test key
    const camp1 = await pool.query(`
      INSERT INTO push_campaigns (title, message, category, idempotency_key, status)
      VALUES ('TradeMax Trading Motivation', 'Stay disciplined in your risk.', 'motivation', $1, 'sent')
      RETURNING id, idempotency_key
    `, [testKey]);
    assert.ok(camp1.rows[0].id);

    // Attempting duplicate insert with same idempotency key must fail with unique constraint violation
    await assert.rejects(
      async () => {
        await pool.query(`
          INSERT INTO push_campaigns (title, message, category, idempotency_key, status)
          VALUES ('TradeMax Trading Motivation', 'Duplicate run', 'motivation', $1, 'sent')
        `, [testKey]);
      },
      /unique constraint|duplicate key/i
    );

    // Clean up
    await pool.query('DELETE FROM push_campaigns WHERE id = $1', [camp1.rows[0].id]);
  });

  test('4. Motivational Quote Rotation Avoids Consecutive Repeats', async () => {
    // Select next quote using the rotation query
    const firstQuote = await pool.query(`
      SELECT id, quote FROM motivational_quotes
      WHERE is_active = TRUE
      ORDER BY last_sent_at ASC NULLS FIRST, id ASC
      LIMIT 1
    `);
    assert.ok(firstQuote.rows.length > 0);
    const firstId = firstQuote.rows[0].id;

    // Simulate sending first quote
    await pool.query('UPDATE motivational_quotes SET last_sent_at = CURRENT_TIMESTAMP WHERE id = $1', [firstId]);

    // Next query must return a DIFFERENT quote
    const nextQuote = await pool.query(`
      SELECT id, quote FROM motivational_quotes
      WHERE is_active = TRUE
      ORDER BY last_sent_at ASC NULLS FIRST, id ASC
      LIMIT 1
    `);
    assert.notEqual(nextQuote.rows[0].id, firstId, 'Consecutive quote selection should rotate to a different quote');
  });

  test('5. Campaign Recovery Cleans Up Stuck Processing Campaigns', async () => {
    // Insert a fake campaign stuck in processing older than 5 minutes
    const stuckCamp = await pool.query(`
      INSERT INTO push_campaigns (title, message, status, created_at)
      VALUES ('Old Stuck Campaign', 'Simulating crash', 'processing', NOW() - INTERVAL '10 minutes')
      RETURNING id
    `);
    const stuckId = stuckCamp.rows[0].id;

    await recoverStuckCampaigns();

    const verified = await pool.query('SELECT status FROM push_campaigns WHERE id = $1', [stuckId]);
    assert.equal(verified.rows[0].status, 'failed', 'Stuck campaign must be automatically marked as failed');

    // Clean up
    await pool.query('DELETE FROM push_campaigns WHERE id = $1', [stuckId]);
  });
});
