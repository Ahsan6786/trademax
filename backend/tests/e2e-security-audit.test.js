import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'trademax_jwt_default_secret_key';
const API_BASE = 'http://localhost:5001/api';

const createAuthToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
};

describe('TRADEMAX Comprehensive End-to-End & Security Audit Suite', () => {
  let auditStudent1;
  let auditStudent2;
  let auditAdmin;
  let student1Token;
  let student2Token;
  let adminToken;
  let uniqueUtr;
  let testCourse;
  let testClaimId;

  before(async () => {
    // 0. Clean any lingering audit records
    await pool.query("DELETE FROM manual_payment_claims WHERE transaction_ref LIKE 'UTR-AUDIT%'");
    await pool.query("DELETE FROM enrollments WHERE email LIKE 'audit.%'");
    await pool.query("DELETE FROM users WHERE email LIKE 'audit.%'");

    uniqueUtr = `UTR-AUDIT-${Date.now().toString().slice(-8)}`;

    // 1. Ensure test course exists in database
    const courseRes = await pool.query(
      `INSERT INTO courses (
        title, subtitle, description, price, original_price, duration, learning_mode,
        batch_name, seats_available, slug, is_published
      ) VALUES (
        'Audit Security Masterclass', 'Automated Audit Course', 'Course for end-to-end security verification',
        7999, 14999, '30 Days', 'Live Online', 'Audit Batch', 45, 'audit-security-course', true
      )
      ON CONFLICT (slug) DO UPDATE SET price = 7999
      RETURNING id, title, slug, price`
    );
    testCourse = courseRes.rows[0];

    // 2. Setup Audit Admin
    const hashedPassword = await bcrypt.hash('AdminAudit@123', 10);
    const adminRes = await pool.query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES ('Audit Administrator', 'audit.admin@trademax.in', $1, 'admin', 'active')
       ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $1
       RETURNING id, name, email, role`,
      [hashedPassword]
    );
    auditAdmin = adminRes.rows[0];
    adminToken = createAuthToken(auditAdmin);

    // 3. Setup Audit Student 2 (for IDOR checks)
    const s2Hashed = await bcrypt.hash('Student2Pass@123', 10);
    const s2Res = await pool.query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES ('Audit Student Beta', 'audit.student2@trademax.in', $1, 'student', 'active')
       ON CONFLICT (email) DO UPDATE SET role = 'student', password = $1
       RETURNING id, name, email, role`,
      [s2Hashed]
    );
    auditStudent2 = s2Res.rows[0];
    student2Token = createAuthToken(auditStudent2);
  });

  after(async () => {
    // Cleanup audit entities
    if (auditStudent1) {
      await pool.query('DELETE FROM enrollments WHERE user_id = $1', [auditStudent1.id]);
      await pool.query('DELETE FROM manual_payment_claims WHERE user_id = $1', [auditStudent1.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [auditStudent1.id]);
    }
    if (auditStudent2) {
      await pool.query('DELETE FROM enrollments WHERE user_id = $1', [auditStudent2.id]);
      await pool.query('DELETE FROM manual_payment_claims WHERE user_id = $1', [auditStudent2.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [auditStudent2.id]);
    }
    if (auditAdmin) {
      await pool.query('DELETE FROM users WHERE id = $1', [auditAdmin.id]);
    }
    if (testCourse) {
      await pool.query('DELETE FROM courses WHERE id = $1', [testCourse.id]);
    }
  });

  // ==========================================================================
  // SECTION 1: AUTHENTICATION & ACCOUNTS AUDIT
  // ==========================================================================
  describe('1. Authentication, Password Security & Accounts', () => {
    it('1.1. Registration validates required fields and rejects invalid email (400)', async () => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Invalid User',
          email: 'not-an-email',
          password: 'validpassword123'
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /valid email/i);
    });

    it('1.2. Registration rejects weak/short password < 6 characters (400)', async () => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Short Password User',
          email: 'shortpass@test.com',
          password: '123'
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /at least 6 characters/i);
    });

    it('1.3. Student successfully registers with valid details', async () => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Audit Student Alpha',
          mobile: '9876543210',
          email: 'audit.student1@trademax.in',
          reference: 'Instagram Ad',
          trading_experience: 'Beginner',
          password: 'StrongStudentPass!2026'
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.user);
      assert.strictEqual(data.user.email, 'audit.student1@trademax.in');
      assert.strictEqual(data.user.role, 'student');
      assert.ok(!data.user.password, 'Password must not be returned in API response');
      assert.ok(data.token, 'JWT token must be issued on registration');

      auditStudent1 = data.user;
      student1Token = data.token;
    });

    it('1.4. Registration prevents duplicate email addresses (409 Conflict)', async () => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Student',
          email: 'AUDIT.STUDENT1@trademax.in', // case-insensitive check
          password: 'AnotherPassword123'
        }),
      });
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /already exists/i);
    });

    it('1.5. Login rejects invalid password (401 Unauthorized)', async () => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'audit.student1@trademax.in',
          password: 'WrongPassword'
        }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /invalid credentials/i);
    });

    it('1.6. Login succeeds with correct credentials and returns authenticated user and token', async () => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'audit.student1@trademax.in',
          password: 'StrongStudentPass!2026'
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
      assert.strictEqual(data.user.role, 'student');
      assert.ok(!data.user.password);
    });

    it('1.7. Database stores securely hashed passwords (never plaintext)', async () => {
      const userDb = await pool.query('SELECT password FROM users WHERE id = $1', [auditStudent1.id]);
      const storedHash = userDb.rows[0].password;
      assert.ok(storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$'), 'Password must be a bcrypt hash');
      assert.notStrictEqual(storedHash, 'StrongStudentPass!2026', 'Password must never be stored as plaintext');
    });

    it('1.8. Malformed or tampered JWT token is rejected (401)', async () => {
      const forgedToken = student1Token.slice(0, -6) + 'abc123';
      const res = await fetch(`${API_BASE}/student/dashboard`, {
        headers: { Authorization: `Bearer ${forgedToken}` },
      });
      assert.strictEqual(res.status, 401);
    });
  });

  // ==========================================================================
  // SECTION 2: ROLE-BASED ACCESS CONTROL & ADMIN SECURITY
  // ==========================================================================
  describe('2. Role-Based Access Control & Admin API Protection', () => {
    it('2.1. Student token CANNOT access Admin Users endpoint (403 Forbidden)', async () => {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /access denied/i);
    });

    it('2.2. Student token CANNOT access Admin Dashboard Stats (403 Forbidden)', async () => {
      const res = await fetch(`${API_BASE}/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      assert.strictEqual(res.status, 403);
    });

    it('2.3. Student token CANNOT access Admin Payment Claims (403 Forbidden)', async () => {
      const res = await fetch(`${API_BASE}/admin/payment-claims`, {
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      assert.strictEqual(res.status, 403);
    });

    it('2.4. Admin token CAN access Admin Dashboard Stats successfully (200 OK)', async () => {
      const res = await fetch(`${API_BASE}/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.stats);
    });
  });

  // ==========================================================================
  // SECTION 3: COURSE PURCHASE & MANUAL PAYMENT VERIFICATION WORKFLOW
  // ==========================================================================
  describe('3. Course Purchase & Payment Verification Workflows', () => {
    it('3.1. Payment claim submission requires authentication (401)', async () => {
      const formData = new FormData();
      formData.append('course_id', testCourse.id);
      formData.append('transaction_ref', 'UTR-AUDIT-1001');
      formData.append('payment_confirmed', 'true');

      const res = await fetch(`${API_BASE}/payments/manual-claim`, {
        method: 'POST',
        body: formData,
      });
      assert.strictEqual(res.status, 401);
    });

    it('3.2. Submitting claim with uploaded screenshot creates PENDING claim with authoritative DB price', async () => {
      // 1x1 valid PNG image buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      const blob = new Blob([pngBuffer], { type: 'image/png' });

      const formData = new FormData();
      formData.append('course_id', testCourse.id);
      formData.append('transaction_ref', uniqueUtr);
      formData.append('payment_confirmed', 'true');
      formData.append('screenshot', blob, 'receipt.png');

      const res = await fetch(`${API_BASE}/payments/manual-claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${student1Token}` },
        body: formData,
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.claim.status, 'PENDING');
      assert.strictEqual(Number(data.claim.amount), Number(testCourse.price), 'Price must match authoritative course price in DB');

      testClaimId = data.claim.claim_id;
      assert.ok(testClaimId, 'Claim ID must be generated');
    });

    it('3.3. PENDING payment claim does NOT grant classroom course access (403 Forbidden)', async () => {
      const res = await fetch(`${API_BASE}/student/courses/${testCourse.id}/classroom`, {
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.isPending, true);
    });

    it('3.4. Duplicate transaction reference (UTR) is rejected (409 Conflict)', async () => {
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      const blob = new Blob([pngBuffer], { type: 'image/png' });

      const formData = new FormData();
      formData.append('course_id', testCourse.id);
      formData.append('transaction_ref', uniqueUtr); // duplicate
      formData.append('payment_confirmed', 'true');
      formData.append('screenshot', blob, 'receipt.png');

      const res = await fetch(`${API_BASE}/payments/manual-claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${student2Token}` },
        body: formData,
      });
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /already been submitted/i);
    });

    it('3.5. Student 2 CANNOT view Student 1 screenshot (IDOR protection - 403)', async () => {
      const res = await fetch(`${API_BASE}/payments/student-claims/${testClaimId}/screenshot`, {
        headers: { Authorization: `Bearer ${student2Token}` },
      });
      assert.strictEqual(res.status, 403);
    });

    it('3.6. Admin approves payment claim -> creates verified enrollment and activates access', async () => {
      const res = await fetch(`${API_BASE}/admin/payment-claims/${testClaimId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ admin_notes: 'Approved during E2E security audit' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.claim.status, 'APPROVED');
      assert.ok(data.enrollmentId, 'Enrollment ID must be created');
    });

    it('3.7. Enrolled student CAN now access classroom course materials (200 OK)', async () => {
      const res = await fetch(`${API_BASE}/student/courses/${testCourse.id}/classroom`, {
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.course, 'Course data must be returned');
      assert.ok(data.data.enrollment, 'Enrollment details must be returned');
      assert.ok(Array.isArray(data.data.lessons), 'Curriculum lessons must be provided');
    });

    it('3.8. Repeated approval is safely rejected (idempotent)', async () => {
      const res = await fetch(`${API_BASE}/admin/payment-claims/${testClaimId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /already been approved/i);

      // Verify DB has exactly 1 enrollment for this user and course
      const countRes = await pool.query(
        'SELECT COUNT(*)::int as count FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [auditStudent1.id, testCourse.id]
      );
      assert.strictEqual(countRes.rows[0].count, 1, 'Must have exactly 1 enrollment row');
    });

    it('3.9. Unenrolled Student 2 is strictly blocked from classroom content (403 Forbidden)', async () => {
      const res = await fetch(`${API_BASE}/student/courses/${testCourse.id}/classroom`, {
        headers: { Authorization: `Bearer ${student2Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /access denied|not authorized|not enrolled/i);
    });

    it('3.10. Direct static URL access to private screenshot directory is strictly forbidden (403 Forbidden)', async () => {
      const res = await fetch(`http://localhost:5001/uploads/private_screenshots/test.png`);
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /forbidden/i);
    });
  });

  // ==========================================================================
  // SECTION 4: SQL INJECTION & INPUT SANITIZATION AUDIT
  // ==========================================================================
  describe('4. SQL Injection Resilience & Input Sanitization', () => {
    it('4.1. SQL Injection payload in login email does not bypass authentication', async () => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: "' OR '1'='1' --",
          password: 'somepassword'
        }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    it('4.2. SQL Injection payload in ticket search query is safely escaped', async () => {
      const sqliSearch = "'; DROP TABLE test_dummy; --";
      const res = await fetch(`${API_BASE}/tickets/admin/all?search=${encodeURIComponent(sqliSearch)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    it('4.3. SQL Injection payload in student course classroom ID is rejected safely', async () => {
      const res = await fetch(`${API_BASE}/student/courses/invalid-id/classroom`, {
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /invalid course id/i);
    });
  });
});
