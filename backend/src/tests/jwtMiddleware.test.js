import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../server.js';

const makeToken = ({ payload, secret = process.env.JWT_SECRET || 'dev-secret-key', expiresIn = '1h' }) =>
  jwt.sign(payload, secret, { expiresIn });

describe('JWT middleware', () => {
  it('rejects a request without an Authorization header', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Authorization', 'Token abc123');

    expect(response.status).toBe(401);
  });

  it('rejects an invalid JWT', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Authorization', 'Bearer not-a-valid-jwt');

    expect(response.status).toBe(401);
  });

  it('rejects an expired JWT', async () => {
    const expiredToken = makeToken({
      payload: { id: 1, email: 'expired@example.com', role: 'user' },
      expiresIn: '-1s',
    });

    const response = await request(app)
      .get('/api/health')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });

  it('allows a valid JWT to proceed', async () => {
    const validToken = makeToken({
      payload: { id: 99, email: 'valid@example.com', role: 'user' },
      expiresIn: '1h',
    });

    const response = await request(app)
      .get('/api/health')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
  });

  it('attaches the decoded user to req.user for valid tokens', async () => {
    const validToken = makeToken({
      payload: { id: 99, email: 'user@example.com', role: 'user' },
      expiresIn: '1h',
    });

    const response = await request(app)
      .get('/api/health')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toMatchObject({
      id: 99,
      email: 'user@example.com',
      role: 'user',
    });
  });

  it('rejects a JWT signed with the wrong secret', async () => {
    const wrongSecretToken = makeToken({
      payload: { id: 4, email: 'wrongsecret@example.com', role: 'user' },
      secret: 'wrong-secret',
      expiresIn: '1h',
    });

    const response = await request(app)
      .get('/api/health')
      .set('Authorization', `Bearer ${wrongSecretToken}`);

    expect(response.status).toBe(401);
  });

  it('does not crash the server when a malformed token is provided', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Authorization', 'Bearer .');

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/unauthorized|invalid token/i);
  });
});
