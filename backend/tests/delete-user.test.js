import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'trademax_secure_jwt_secret_key_2026';
const BASE_URL = 'http://localhost:5001';

test('Admin User Deletion & Statistics Workflow', async (t) => {
  // 1. Get or create admin user and token
  const adminRes = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'admin' LIMIT 1");
  assert.ok(adminRes.rows.length > 0, 'Admin account must exist');
  const adminUser = adminRes.rows[0];

  const adminToken = jwt.sign(
    { id: adminUser.id, email: adminUser.email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 2. Create a test student with associated records
  const uniqueNum = Date.now();
  const testStudentEmail = `del_test_${uniqueNum}@example.com`;
  const studentInsert = await pool.query(
    `INSERT INTO users (name, email, mobile, password, role, status)
     VALUES ($1, $2, $3, $4, 'student', 'active')
     RETURNING id, name, email`,
    [`Delete Test User ${uniqueNum}`, testStudentEmail, '9876543210', 'hashed_pass_123']
  );
  const student = studentInsert.rows[0];

  const studentToken = jwt.sign(
    { id: student.id, email: student.email, role: 'student' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create associated enrollment
  const courseRes = await pool.query('SELECT id, title FROM courses LIMIT 1');
  const course = courseRes.rows[0];
  const enrollRes = await pool.query(
    `INSERT INTO enrollments (user_id, course_id, course_name, name, email, mobile, enrollment_status, payment_status, amount_paid)
     VALUES ($1, $2, $3, $4, $5, $6, 'enrolled', 'completed', 19999.00)
     RETURNING id`,
    [student.id, course.id, course.title, student.name, student.email, '9876543210']
  );
  const enrollmentId = enrollRes.rows[0].id;

  // Create associated claim
  const claimId = `MPC-DELTEST-${uniqueNum.toString().slice(-6)}`;
  await pool.query(
    `INSERT INTO manual_payment_claims (claim_id, user_id, course_id, enrollment_id, amount, transaction_ref, screenshot_path, status)
     VALUES ($1, $2, $3, $4, 19999.00, $5, 'uploads/test.png', 'APPROVED')`,
    [claimId, student.id, course.id, enrollmentId, `UTR${uniqueNum}`]
  );

  // Measure initial dashboard stats
  const initialStatsRes = await fetch(`${BASE_URL}/api/admin/dashboard/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const initialStatsData = await initialStatsRes.json();
  assert.equal(initialStatsRes.status, 200);
  const initialUsersCount = initialStatsData.stats.totalUsers;

  await t.test('A. Student cannot delete users (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users/${student.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 403);
  });

  await t.test('B. Cannot delete administrator account (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users/${adminUser.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // Can be 400 (cannot delete own account) or 403 (cannot delete admin)
    assert.ok(res.status === 400 || res.status === 403);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  await t.test('C. Cannot delete non-existent user ID (404 Not Found)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users/99999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 404);
  });

  await t.test('D. Admin permanently deletes student account and associated data', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users/${student.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.deletedUserId, student.id);

    // Verify user is gone from database
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [student.id]);
    assert.equal(userCheck.rows.length, 0, 'User row must be deleted');

    // Verify associated enrollment is gone
    const enrollCheck = await pool.query('SELECT * FROM enrollments WHERE user_id = $1 OR LOWER(email) = LOWER($2)', [student.id, student.email]);
    assert.equal(enrollCheck.rows.length, 0, 'Associated enrollments must be deleted');

    // Verify associated claim is gone
    const claimCheck = await pool.query('SELECT * FROM manual_payment_claims WHERE user_id = $1', [student.id]);
    assert.equal(claimCheck.rows.length, 0, 'Associated payment claims must be deleted');
  });

  await t.test('E. Dashboard statistics update automatically after deletion', async () => {
    const newStatsRes = await fetch(`${BASE_URL}/api/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const newStatsData = await newStatsRes.json();
    assert.equal(newStatsRes.status, 200);
    assert.equal(newStatsData.stats.totalUsers, initialUsersCount - 1, 'Total users stat must decrease by 1');
  });

  await t.test('F. User list reflects deletion', async () => {
    const listRes = await fetch(`${BASE_URL}/api/admin/users?search=${encodeURIComponent(student.email)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.equal(listData.users.length, 0, 'Deleted user must not appear in user list search');
  });
});
