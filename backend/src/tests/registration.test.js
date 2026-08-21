import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import app from '../server.js';
import { pool } from '../config/database.js';

const buildUniqueEmail = (prefix = 'reg') => `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}@example.com`;

const cleanupUserByEmail = async (email) => {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
};

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    await pool.query('SELECT 1');
  });

  afterEach(async () => {
    // no-op: tests clean up their own specific emails to avoid collisions across runs
  });

  it('registers a valid user, stores the hash in PostgreSQL, and hides password data in the response', async () => {
    const email = buildUniqueEmail('success');
    const password = 'SecurePass123!';

    try {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Register',
          email,
          password,
          role: 'admin',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toMatchObject({
        name: 'Alice Register',
        email,
        role: 'user',
      });
      expect(response.body.user.passwordHash).toBeUndefined();
      expect(response.body.user.password_hash).toBeUndefined();

      const stored = await pool.query(
        'SELECT name, email, password_hash, role FROM users WHERE email = $1',
        [email]
      );

      expect(stored.rows).toHaveLength(1);
      expect(stored.rows[0].name).toBe('Alice Register');
      expect(stored.rows[0].role).toBe('user');
      expect(stored.rows[0].password_hash).not.toBe(password);
      expect(stored.rows[0].password_hash).toMatch(/^\$2[aby]\$/);
      expect(stored.rows[0].password_hash).not.toBeNull();
    } finally {
      await cleanupUserByEmail(email);
    }
  });

  it('rejects a duplicate email', async () => {
    const email = buildUniqueEmail('duplicate');
    const payload = { name: 'Duplicate User', email, password: 'SecurePass123!' };

    try {
      const first = await request(app).post('/api/auth/register').send(payload);
      const second = await request(app).post('/api/auth/register').send(payload);

      expect(first.status).toBe(201);
      expect(second.status).toBe(409);
      expect(second.body.message).toMatch(/already|exists|duplicate/i);
    } finally {
      await cleanupUserByEmail(email);
    }
  });

  it('rejects malformed email addresses', async () => {
    const email = buildUniqueEmail('bad-email');
    const response = await request(app).post('/api/auth/register').send({
      name: 'Bad Email User',
      email: 'not-an-email',
      password: 'SecurePass123!',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/email/i);
    await cleanupUserByEmail(email);
  });

  it('rejects short or invalid passwords', async () => {
    const email = buildUniqueEmail('short-pass');
    const response = await request(app).post('/api/auth/register').send({
      name: 'Short Password User',
      email,
      password: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/password/i);
    await cleanupUserByEmail(email);
  });

  it('rejects missing required fields', async () => {
    const email = buildUniqueEmail('missing');

    const missingName = await request(app).post('/api/auth/register').send({
      email,
      password: 'SecurePass123!',
    });

    const missingEmail = await request(app).post('/api/auth/register').send({
      name: 'Missing Email User',
      password: 'SecurePass123!',
    });

    const missingPassword = await request(app).post('/api/auth/register').send({
      name: 'Missing Password User',
      email,
    });

    expect(missingName.status).toBe(400);
    expect(missingEmail.status).toBe(400);
    expect(missingPassword.status).toBe(400);

    await cleanupUserByEmail(email);
  });

  it('uses a default role of user and ignores a client-supplied admin role', async () => {
    const email = buildUniqueEmail('role');
    const password = 'SecurePass123!';

    try {
      const response = await request(app).post('/api/auth/register').send({
        name: 'Role User',
        email,
        password,
        role: 'admin',
      });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('user');

      const stored = await pool.query(
        'SELECT role FROM users WHERE email = $1',
        [email]
      );

      expect(stored.rows[0].role).toBe('user');
    } finally {
      await cleanupUserByEmail(email);
    }
  });

  it('persists the user directly to PostgreSQL and can be retrieved by email', async () => {
    const email = buildUniqueEmail('persist');
    const password = 'SecurePass123!';

    try {
      const response = await request(app).post('/api/auth/register').send({
        name: 'Persisted User',
        email,
        password,
      });

      expect(response.status).toBe(201);

      const stored = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      expect(stored.rows).toHaveLength(1);
      expect(stored.rows[0].email).toBe(email);
      expect(stored.rows[0].name).toBe('Persisted User');
      expect(stored.rows[0].password_hash).not.toBe(password);
    } finally {
      await cleanupUserByEmail(email);
    }
  });
});
