import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import app from '../server.js';
import { pool } from '../config/database.js';

const buildUniqueEmail = (prefix = 'login') => `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}@example.com`;

const cleanupUserByEmail = async (email) => {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
};

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await pool.query('SELECT 1');
  });

  afterEach(async () => {
    // each test cleans up its own email to avoid collisions
  });

  it('logs in successfully with a valid email and password', async () => {
    const email = buildUniqueEmail('success-login');
    const password = 'SecurePass123!';

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      ['Login User', email, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92Z6pO2gLW4fK4D9r7L7m', 'user']
    );

    try {
      const response = await request(app).post('/api/auth/login').send({ email, password });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toMatchObject({
        name: 'Login User',
        email,
        role: 'user',
      });
      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.password_hash).toBeUndefined();
    } finally {
      await cleanupUserByEmail(email);
    }
  });

  it('fails login for an incorrect password', async () => {
    const email = buildUniqueEmail('bad-password');
    const password = 'SecurePass123!';

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      ['Bad Password User', email, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92Z6pO2gLW4fK4D9r7L7m', 'user']
    );

    try {
      const response = await request(app).post('/api/auth/login').send({ email, password: 'WrongPassword!' });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/invalid|credentials/i);
    } finally {
      await cleanupUserByEmail(email);
    }
  });

  it('fails login for an unknown email', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: buildUniqueEmail('unknown-email'),
      password: 'SecurePass123!',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid|credentials/i);
  });

  it('returns a JWT after successful login', async () => {
    const email = buildUniqueEmail('jwt-success');
    const password = 'SecurePass123!';

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      ['JWT User', email, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92Z6pO2gLW4fK4D9r7L7m', 'user']
    );

    try {
      const response = await request(app).post('/api/auth/login').send({ email, password });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy();
      const decoded = jwt.decode(response.body.token);
      expect(decoded).toMatchObject({
        email,
        role: 'user',
      });
    } finally {
      await cleanupUserByEmail(email);
    }
  });

  it('includes the correct user identity and role in the JWT payload', async () => {
    const email = buildUniqueEmail('jwt-claims');
    const password = 'SecurePass123!';

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      ['Claim User', email, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92Z6pO2gLW4fK4D9r7L7m', 'user']
    );

    try {
      const response = await request(app).post('/api/auth/login').send({ email, password });

      const decoded = jwt.decode(response.body.token);
      expect(decoded).toMatchObject({
        id: expect.any(Number),
        email,
        role: 'user',
      });
    } finally {
      await cleanupUserByEmail(email);
    }
  });

  it('sets an expiration on the JWT', async () => {
    const email = buildUniqueEmail('jwt-exp');
    const password = 'SecurePass123!';

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      ['Expiry User', email, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92Z6pO2gLW4fK4D9r7L7m', 'user']
    );

    try {
      const response = await request(app).post('/api/auth/login').send({ email, password });
      const decoded = jwt.decode(response.body.token);
      expect(decoded.exp).toBeTypeOf('number');
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    } finally {
      await cleanupUserByEmail(email);
    }
  });

  it('verifies the password against the stored bcrypt hash and never returns the hash', async () => {
    const email = buildUniqueEmail('hash-check');
    const password = 'SecurePass123!';
    const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92Z6pO2gLW4fK4D9r7L7m';

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      ['Hash User', email, hash, 'user']
    );

    try {
      const response = await request(app).post('/api/auth/login').send({ email, password });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy();
      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.password_hash).toBeUndefined();
    } finally {
      await cleanupUserByEmail(email);
    }
  });

  it('rejects invalid or missing email', async () => {
    const missingEmailResponse = await request(app).post('/api/auth/login').send({ password: 'SecurePass123!' });
    const invalidEmailResponse = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'SecurePass123!' });

    expect(missingEmailResponse.status).toBe(400);
    expect(invalidEmailResponse.status).toBe(400);
  });

  it('rejects missing password', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: buildUniqueEmail('missing-password') });

    expect(response.status).toBe(400);
  });
});
