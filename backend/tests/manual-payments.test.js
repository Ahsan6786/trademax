import assert from 'node:assert/strict';
import test, { describe, before, after } from 'node:test';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db.js';

const BASE_URL = 'http://localhost:5001';
const JWT_SECRET = process.env.JWT_SECRET || 'trademax_jwt_default_secret_key';

// Helper to sign test tokens
const createToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

// 1x1 valid JPEG magic bytes: \xFF\xD8\xFF...
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0xff, 0xd9,
]);

// Helper to create multipart/form-data request body
function createMultipartFormData(fields, fileField) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const crlf = '\r\n';
  let bodyBuffers = [];

  for (const [key, value] of Object.entries(fields)) {
    bodyBuffers.push(
      Buffer.from(
        `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${value}${crlf}`
      )
    );
  }

  if (fileField) {
    bodyBuffers.push(
      Buffer.from(
        `--${boundary}${crlf}Content-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"${crlf}Content-Type: ${fileField.contentType}${crlf}${crlf}`
      )
    );
    bodyBuffers.push(fileField.buffer);
    bodyBuffers.push(Buffer.from(crlf));
  }

  bodyBuffers.push(Buffer.from(`--${boundary}--${crlf}`));
  const body = Buffer.concat(bodyBuffers);

  return {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length.toString(),
    },
    body,
  };
}

describe('TRADEMAX Manual Payment Verification Test Suite (Scenarios A through P)', () => {
  let student1User;
  let student2User;
  let adminUser;
  let student1Token;
  let student2Token;
  let adminToken;
  let testCourse1;
  let testCourse2;
  let initialPaymentsCount = 0;
  let initialEnrollmentsCount = 0;

  before(async () => {
    // Record baseline records for Scenario P
    const pCountRes = await pool.query('SELECT COUNT(*) FROM payments');
    initialPaymentsCount = parseInt(pCountRes.rows[0].count, 10);
    const eCountRes = await pool.query('SELECT COUNT(*) FROM enrollments');
    initialEnrollmentsCount = parseInt(eCountRes.rows[0].count, 10);

    // Pick two existing courses
    const coursesRes = await pool.query('SELECT id, title, price FROM courses ORDER BY id ASC LIMIT 2');
    testCourse1 = coursesRes.rows[0];
    testCourse2 = coursesRes.rows[1];

    // Find or create admin user
    const adminRes = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'admin' LIMIT 1");
    adminUser = adminRes.rows[0];
    adminToken = createToken({ id: adminUser.id, email: adminUser.email, name: adminUser.name, role: 'admin' });

    // Clean up any old test users
    await pool.query("DELETE FROM users WHERE email IN ('test_student1@example.com', 'test_student2@example.com')");

    // Create student 1
    const s1Res = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ('Test Student One', 'test_student1@example.com', 'hash', 'student') RETURNING id, name, email, role"
    );
    student1User = s1Res.rows[0];
    student1Token = createToken(student1User);

    // Create student 2
    const s2Res = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ('Test Student Two', 'test_student2@example.com', 'hash', 'student') RETURNING id, name, email, role"
    );
    student2User = s2Res.rows[0];
    student2Token = createToken(student2User);

    // Ensure payment_settings has UPI configured for tests
    await pool.query(
      "UPDATE payment_settings SET upi_id = 'trademax@icici', recipient_name = 'PATIL TANISHQ DEEPAK', is_manual_enabled = true WHERE id = 1"
    );
  });

  after(async () => {
    // Clean up created test claims, payments, and enrollments
    await pool.query('DELETE FROM payments WHERE user_id IN ($1, $2)', [student1User.id, student2User.id]);
    await pool.query('DELETE FROM enrollments WHERE user_id IN ($1, $2)', [student1User.id, student2User.id]);
    await pool.query('DELETE FROM manual_payment_claims WHERE user_id IN ($1, $2)', [student1User.id, student2User.id]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [student1User.id, student2User.id]);
    await pool.end();
  });

  // Scenario A: Student submits a valid payment claim
  let submittedClaimId;
  const validUtr = 'UTR' + Date.now().toString();

  test('A. Student submits a valid payment claim', async () => {
    const multipart = createMultipartFormData(
      {
        courseId: testCourse1.id.toString(),
        transactionRef: validUtr,
        payment_confirmed: 'true',
        clientAmount: '99999', // should be ignored and overridden by server
      },
      {
        name: 'screenshot',
        filename: 'proof.jpg',
        contentType: 'image/jpeg',
        buffer: VALID_JPEG_BUFFER,
      }
    );

    const res = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: {
        ...multipart.headers,
        Authorization: `Bearer ${student1Token}`,
      },
      body: multipart.body,
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.claim.status, 'PENDING');
    assert.equal(data.claim.transaction_ref, validUtr);
    submittedClaimId = data.claim.claim_id;
    assert.ok(submittedClaimId);
  });

  // Scenario B: Unauthenticated student cannot submit a claim
  test('B. Unauthenticated student cannot submit a claim', async () => {
    const multipart = createMultipartFormData(
      {
        courseId: testCourse1.id.toString(),
        transactionRef: 'UTR_UNAUTH_' + Date.now(),
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'proof.jpg',
        contentType: 'image/jpeg',
        buffer: VALID_JPEG_BUFFER,
      }
    );

    const res = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: multipart.headers,
      body: multipart.body,
    });

    assert.equal(res.status, 401);
  });

  // Scenario C: Student cannot view another student's payment claim (IDOR protection)
  test("C. Student cannot view another student's payment claim (IDOR)", async () => {
    // Student 2 fetches claims; should not see student 1's claim
    const res = await fetch(`${BASE_URL}/api/student/payment-claims`, {
      headers: {
        Authorization: `Bearer ${student2Token}`,
      },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    const hasStudent1Claim = data.claims.some((c) => c.claim_id === submittedClaimId || c.id === submittedClaimId);
    assert.equal(hasStudent1Claim, false);

    // Student 2 tries to download Student 1's screenshot directly
    const sRes = await fetch(`${BASE_URL}/api/student/payment-claims/${submittedClaimId}/screenshot`, {
      headers: {
        Authorization: `Bearer ${student2Token}`,
      },
    });
    assert.ok(sRes.status === 403 || sRes.status === 404);
  });

  // Scenario D: Student cannot approve their own payment
  test('D. Student cannot approve their own payment', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/payment-claims/${submittedClaimId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student1Token}`,
      },
      body: JSON.stringify({ admin_notes: 'Self-approval attempt' }),
    });

    assert.equal(res.status, 403);
  });

  // Scenario E: Duplicate transaction reference is detected
  test('E. Duplicate transaction reference is detected', async () => {
    const multipart = createMultipartFormData(
      {
        courseId: testCourse1.id.toString(),
        transactionRef: validUtr.toLowerCase(), // case-insensitive match
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'proof.jpg',
        contentType: 'image/jpeg',
        buffer: VALID_JPEG_BUFFER,
      }
    );

    const res = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: {
        ...multipart.headers,
        Authorization: `Bearer ${student2Token}`,
      },
      body: multipart.body,
    });

    const data = await res.json();
    assert.equal(res.status, 409);
    assert.equal(data.success, false);
    assert.match(data.error, /already been submitted|already associated/i);
  });

  // Scenario F: Invalid screenshot format is rejected (magic-byte validation)
  test('F. Invalid screenshot format is rejected', async () => {
    const fakeImageBuffer = Buffer.from('This is not an image at all! Just text disguised as image.');
    const multipart = createMultipartFormData(
      {
        courseId: testCourse2.id.toString(), // use course 2 to test screenshot validation without duplicate course claim conflict
        transactionRef: 'UTR_FAKE_' + Date.now(),
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'proof.png',
        contentType: 'image/png',
        buffer: fakeImageBuffer,
      }
    );

    const res = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: {
        ...multipart.headers,
        Authorization: `Bearer ${student1Token}`,
      },
      body: multipart.body,
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.error, /invalid image format|corrupted or invalid/i);
  });

  // Scenario G: Oversized screenshot is rejected
  test('G. Oversized screenshot is rejected', async () => {
    // 5.5MB dummy buffer
    const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0xff);
    bigBuffer[0] = 0xff;
    bigBuffer[1] = 0xd8;
    bigBuffer[2] = 0xff;

    const multipart = createMultipartFormData(
      {
        courseId: testCourse1.id.toString(),
        transactionRef: 'UTR_BIG_' + Date.now(),
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'big.jpg',
        contentType: 'image/jpeg',
        buffer: bigBuffer,
      }
    );

    const res = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: {
        ...multipart.headers,
        Authorization: `Bearer ${student1Token}`,
      },
      body: multipart.body,
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
  });

  // Scenario H: Course price cannot be manipulated through frontend requests
  test('H. Course price cannot be manipulated through frontend requests', async () => {
    const claimRes = await pool.query('SELECT amount FROM manual_payment_claims WHERE claim_id = $1', [submittedClaimId]);
    const storedAmount = parseFloat(claimRes.rows[0].amount);
    const officialCoursePrice = parseFloat(testCourse1.price);

    assert.equal(storedAmount, officialCoursePrice);
  });

  // Scenario I: Pending claim does not grant course access
  test('I. Pending claim does not grant course access', async () => {
    // Check classroom endpoint: access must be denied (403) while claim is pending
    const res = await fetch(`${BASE_URL}/api/student/courses/${testCourse1.id}/classroom`, {
      headers: {
        Authorization: `Bearer ${student1Token}`,
      },
    });
    assert.equal(res.status, 403);
  });

  // Scenario J: Approved claim grants the correct course access
  test('J. Approved claim grants the correct course access', async () => {
    const approveRes = await fetch(`${BASE_URL}/api/admin/payment-claims/${submittedClaimId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ admin_notes: 'Verified via test runner' }),
    });

    const approveData = await approveRes.json();
    assert.equal(approveRes.status, 200);
    assert.equal(approveData.success, true);
    assert.equal(approveData.claim.status, 'APPROVED');

    // Verify course classroom is now fully accessible (200 OK)
    const classroomRes = await fetch(`${BASE_URL}/api/student/courses/${testCourse1.id}/classroom`, {
      headers: {
        Authorization: `Bearer ${student1Token}`,
      },
    });
    assert.equal(classroomRes.status, 200);
  });

  // Scenario K: Rejected claim does not grant course access
  test('K. Rejected claim does not grant course access', async () => {
    // Student 1 submits claim for course 2
    const utr2 = 'UTR_REJECT_' + Date.now();
    const multipart = createMultipartFormData(
      {
        courseId: testCourse2.id.toString(),
        transactionRef: utr2,
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'proof.jpg',
        contentType: 'image/jpeg',
        buffer: VALID_JPEG_BUFFER,
      }
    );

    const submitRes = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: {
        ...multipart.headers,
        Authorization: `Bearer ${student1Token}`,
      },
      body: multipart.body,
    });
    const submitData = await submitRes.json();
    assert.equal(submitRes.status, 201);
    const claim2Id = submitData.claim.claim_id;

    // Admin rejects it
    const rejectRes = await fetch(`${BASE_URL}/api/admin/payment-claims/${claim2Id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        rejection_reason: 'UTR reference not found in bank statement',
        admin_notes: 'Rejected by test runner',
      }),
    });
    const rejectData = await rejectRes.json();
    assert.equal(rejectRes.status, 200);
    assert.equal(rejectData.claim.status, 'REJECTED');
    assert.equal(rejectData.claim.rejection_reason, 'UTR reference not found in bank statement');

    // Verify student is NOT granted classroom access for course 2
    const checkRes = await fetch(`${BASE_URL}/api/student/courses/${testCourse2.id}/classroom`, {
      headers: {
        Authorization: `Bearer ${student1Token}`,
      },
    });
    assert.equal(checkRes.status, 403);
  });

  // Scenario L: Duplicate approval does not create duplicate enrollment
  test('L. Duplicate approval does not create duplicate enrollment', async () => {
    const dupRes = await fetch(`${BASE_URL}/api/admin/payment-claims/${submittedClaimId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ admin_notes: 'Duplicate approval attempt' }),
    });

    const dupData = await dupRes.json();
    assert.equal(dupRes.status, 400);
    assert.equal(dupData.success, false);
    assert.match(dupData.error, /already been approved/i);

    // Verify enrollments count for this course and user is exactly 1
    const enrollRes = await pool.query(
      'SELECT COUNT(*) FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [student1User.id, testCourse1.id]
    );
    assert.equal(parseInt(enrollRes.rows[0].count, 10), 1);
  });

  // Scenario M: Concurrent approval requests are handled safely
  test('M. Concurrent approval requests are handled safely', async () => {
    // Create fresh claim for student 2 on course 1
    const utr3 = 'UTR_CONCUR_' + Date.now();
    const multipart = createMultipartFormData(
      {
        courseId: testCourse1.id.toString(),
        transactionRef: utr3,
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'proof.jpg',
        contentType: 'image/jpeg',
        buffer: VALID_JPEG_BUFFER,
      }
    );

    const submitRes = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: {
        ...multipart.headers,
        Authorization: `Bearer ${student2Token}`,
      },
      body: multipart.body,
    });
    const submitData = await submitRes.json();
    assert.equal(submitRes.status, 201);
    const claim3Id = submitData.claim.claim_id;

    // Send 3 simultaneous approval requests
    const [res1, res2, res3] = await Promise.all([
      fetch(`${BASE_URL}/api/admin/payment-claims/${claim3Id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ admin_notes: 'Concurrent 1' }),
      }),
      fetch(`${BASE_URL}/api/admin/payment-claims/${claim3Id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ admin_notes: 'Concurrent 2' }),
      }),
      fetch(`${BASE_URL}/api/admin/payment-claims/${claim3Id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ admin_notes: 'Concurrent 3' }),
      }),
    ]);

    const statuses = [res1.status, res2.status, res3.status];
    // Exactly one must be 200, the others 400
    const successCount = statuses.filter((s) => s === 200).length;
    assert.equal(successCount, 1);

    // Verify exactly one enrollment was created
    const enrollRes = await pool.query(
      'SELECT COUNT(*) FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [student2User.id, testCourse1.id]
    );
    assert.equal(parseInt(enrollRes.rows[0].count, 10), 1);
  });

  // Scenario N: Unauthorized users cannot access admin payment endpoints
  test('N. Unauthorized users cannot access admin payment endpoints', async () => {
    const endpoints = [
      { method: 'GET', url: `${BASE_URL}/api/admin/payment-claims` },
      { method: 'GET', url: `${BASE_URL}/api/admin/payment-settings` },
      { method: 'PUT', url: `${BASE_URL}/api/admin/payment-settings`, body: { recipient_name: 'Hacked' } },
    ];

    for (const ep of endpoints) {
      // 1. Unauthenticated
      const unauthRes = await fetch(ep.url, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert.equal(unauthRes.status, 401);

      // 2. Student token
      const studentRes = await fetch(ep.url, {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${student1Token}`,
        },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert.equal(studentRes.status, 403);
    }
  });

  // Scenario O: Missing payment configuration prevents checkout
  test('O. Missing payment configuration prevents checkout', async () => {
    // Disable manual payments
    await pool.query('UPDATE payment_settings SET is_manual_enabled = false WHERE id = 1');

    const configRes = await fetch(`${BASE_URL}/api/payments/manual-config`);
    const configData = await configRes.json();
    assert.equal(configData.isConfigured, false);

    // Student attempting to submit claim is rejected
    const multipart = createMultipartFormData(
      {
        courseId: testCourse2.id.toString(),
        transactionRef: 'UTR_DISABLED_' + Date.now(),
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'proof.jpg',
        contentType: 'image/jpeg',
        buffer: VALID_JPEG_BUFFER,
      }
    );

    const submitRes = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: {
        ...multipart.headers,
        Authorization: `Bearer ${student1Token}`,
      },
      body: multipart.body,
    });
    const submitData = await submitRes.json();
    assert.equal(submitRes.status, 400);
    assert.equal(submitData.success, false);
    assert.match(submitData.error, /disabled/i);

    // Re-enable
    await pool.query('UPDATE payment_settings SET is_manual_enabled = true WHERE id = 1');
  });

  // Scenario P: Existing course enrollments and historical payment records remain intact
  test('P. Existing course enrollments and historical payment records remain intact', async () => {
    const pCountRes = await pool.query(
      'SELECT COUNT(*) FROM payments WHERE user_id IS NULL OR user_id NOT IN ($1, $2)',
      [student1User.id, student2User.id]
    );
    const nonTestPaymentCount = parseInt(pCountRes.rows[0].count, 10);
    assert.equal(nonTestPaymentCount, initialPaymentsCount);

    const eCountRes = await pool.query(
      'SELECT COUNT(*) FROM enrollments WHERE user_id IS NULL OR user_id NOT IN ($1, $2)',
      [student1User.id, student2User.id]
    );
    const nonTestEnrollmentCount = parseInt(eCountRes.rows[0].count, 10);
    assert.equal(nonTestEnrollmentCount, initialEnrollmentsCount);
  });
});
