import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'trademax_jwt_default_secret_key';
const BASE_URL = 'http://localhost:5001/api/tickets';

const createAuthToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
};

describe('TRADEMAX Support Ticket System Test Suite', () => {
  let studentA;
  let studentB;
  let adminUser;
  let tokenA;
  let tokenB;
  let adminToken;
  let createdTicketId;

  before(async () => {
    // 1. Setup Student A
    const resA = await pool.query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES ('Ticket Student Alpha', 'student.alpha@test.com', 'hashedpass', 'student', 'active')
       ON CONFLICT (email) DO UPDATE SET role = 'student'
       RETURNING id, name, email, role`
    );
    studentA = resA.rows[0];
    tokenA = createAuthToken(studentA);

    // 2. Setup Student B (for IDOR tests)
    const resB = await pool.query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES ('Ticket Student Beta', 'student.beta@test.com', 'hashedpass', 'student', 'active')
       ON CONFLICT (email) DO UPDATE SET role = 'student'
       RETURNING id, name, email, role`
    );
    studentB = resB.rows[0];
    tokenB = createAuthToken(studentB);

    // 3. Setup Admin
    const resAdmin = await pool.query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES ('Ticket Administrator', 'admin.tickets@test.com', 'hashedpass', 'admin', 'active')
       ON CONFLICT (email) DO UPDATE SET role = 'admin'
       RETURNING id, name, email, role`
    );
    adminUser = resAdmin.rows[0];
    adminToken = createAuthToken(adminUser);
  });

  after(async () => {
    // Clean up test data
    if (studentA) {
      await pool.query('DELETE FROM support_tickets WHERE user_id IN ($1, $2)', [studentA.id, studentB.id]);
      await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [studentA.id, studentB.id, adminUser.id]);
    }
  });

  it('1. Unauthenticated user cannot create a support ticket (401)', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'Cannot login to portal',
        message: 'Need help accessing my dashboard',
      }),
    });
    assert.equal(res.status, 401);
  });

  it('2. Student A creates a valid support ticket with initial message', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        subject: 'Query regarding Live Class Recordings',
        category: 'Live Class & Schedule',
        priority: 'high',
        message: 'Hello, when will yesterday evening live webinar recording be available on the portal?',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.ticket.ticket_number.startsWith('TKT-'));
    assert.equal(data.ticket.status, 'open');
    assert.equal(data.ticket.priority, 'high');
    assert.equal(data.ticket.user_id, studentA.id);
    assert.equal(data.ticket.messages.length, 1);
    assert.equal(data.ticket.messages[0].sender_role, 'student');
    createdTicketId = data.ticket.id;
  });

  it('3. Ticket validation rejects empty subject or message', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        subject: 'Hi',
        message: 'No',
      }),
    });
    assert.equal(res.status, 400);
  });

  it('4. Student A retrieves their ticket list and finds the newly created ticket', async () => {
    const res = await fetch(`${BASE_URL}/my-tickets`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.tickets));
    const found = data.tickets.find((t) => t.id === createdTicketId);
    assert.ok(found);
    assert.equal(found.subject, 'Query regarding Live Class Recordings');
    assert.equal(found.message_count, 1);
  });

  it('5. Student A can view full ticket conversation thread', async () => {
    const res = await fetch(`${BASE_URL}/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.ticket.id, createdTicketId);
    assert.equal(data.messages.length, 1);
  });

  it('6. Student B cannot access Student A ticket (IDOR security check - 403)', async () => {
    const res = await fetch(`${BASE_URL}/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('7. Student B cannot reply to Student A ticket (403)', async () => {
    const res = await fetch(`${BASE_URL}/${createdTicketId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ message: 'Unauthorized intrusion attempt' }),
    });
    assert.equal(res.status, 403);
  });

  it('8. Student A posts a follow-up reply to their ticket', async () => {
    const res = await fetch(`${BASE_URL}/${createdTicketId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ message: 'Also please confirm if the slide deck will be uploaded as a PDF.' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.message.sender_role, 'student');
  });

  it('9. Admin views all tickets with statistics', async () => {
    const res = await fetch(`${BASE_URL}/admin/all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.tickets.length >= 1);
    assert.ok(data.stats.total >= 1);
    const found = data.tickets.find((t) => t.id === createdTicketId);
    assert.ok(found);
    assert.equal(found.student_name, 'Ticket Student Alpha');
    assert.equal(found.message_count, 2);
  });

  it('10. Non-admin user cannot access admin ticket list (403)', async () => {
    const res = await fetch(`${BASE_URL}/admin/all`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 403);
  });

  it('11. Admin updates ticket priority to urgent', async () => {
    const res = await fetch(`${BASE_URL}/admin/${createdTicketId}/priority`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ priority: 'urgent' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.ticket.priority, 'urgent');
  });

  it('12. Admin replies to ticket and updates status to resolved', async () => {
    const res = await fetch(`${BASE_URL}/admin/${createdTicketId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        message: 'Hello Alpha, the recording has been processed and is now available in your Classroom tab. The PDF is also attached.',
        new_status: 'resolved',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.message.sender_role, 'admin');
    assert.equal(data.ticket.status, 'resolved');
    assert.ok(data.ticket.resolved_at);
  });

  it('13. Student A can reopen the resolved ticket with a new question', async () => {
    const res = await fetch(`${BASE_URL}/${createdTicketId}/reopen`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.ticket.status, 'open');
  });

  it('14. Student A replies to the reopened ticket and closes it once fully satisfied', async () => {
    const replyRes = await fetch(`${BASE_URL}/${createdTicketId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ message: 'Thank you so much! I verified the recording and slides. Everything works.' }),
    });
    assert.equal(replyRes.status, 200);

    const closeRes = await fetch(`${BASE_URL}/${createdTicketId}/close`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
    });
    assert.equal(closeRes.status, 200);
    const closeData = await closeRes.json();
    assert.equal(closeData.success, true);
    assert.equal(closeData.ticket.status, 'resolved');
  });
});
