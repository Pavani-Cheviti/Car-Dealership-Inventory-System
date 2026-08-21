import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../server.js';

const makeToken = ({
  user = { id: 1, email: 'user@example.com' },
  role = 'user',
  secret = process.env.JWT_SECRET,
  expiresIn = '1h',
}) => jwt.sign({ ...user, role }, secret, { expiresIn });

describe('Admin authorization', () => {
  it('rejects a request without a JWT', async () => {
    const response = await request(app).get('/api/admin/health');

    expect(response.status).toBe(401);
  });

  it('rejects a valid USER JWT on an admin-only route', async () => {
    const token = makeToken({
      user: { id: 42, email: 'user@example.com' },
      role: 'user',
    });

    const response = await request(app)
      .get('/api/admin/health')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('allows a valid ADMIN JWT on an admin-only route', async () => {
    const token = makeToken({
      user: { id: 99, email: 'admin@example.com' },
      role: 'admin',
    });

    const response = await request(app)
      .get('/api/admin/health')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      user: {
        id: 99,
        email: 'admin@example.com',
        role: 'admin',
      },
    });
  });

  it('rejects a JWT with a missing role', async () => {
    const token = jwt.sign({ id: 11, email: 'missing-role@example.com' }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    const response = await request(app)
      .get('/api/admin/health')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('rejects a JWT with an invalid or unrecognized role', async () => {
    const token = makeToken({
      user: { id: 12, email: 'invalid-role@example.com' },
      role: 'superuser',
    });

    const response = await request(app)
      .get('/api/admin/health')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('does not allow a client to become admin by sending role in the request body', async () => {
    const token = makeToken({
      user: { id: 13, email: 'body-role@example.com' },
      role: 'user',
    });

    const response = await request(app)
      .get('/api/admin/health')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });

    expect(response.status).toBe(403);
  });

  it('uses the role from the verified JWT instead of the client-supplied role', async () => {
    const token = makeToken({
      user: { id: 14, email: 'jwt-role@example.com' },
      role: 'user',
    });

    const response = await request(app)
      .get('/api/admin/health')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/admin access required|forbidden/i);
  });

  it('still accepts a valid USER JWT on a normal authenticated route', async () => {
    const token = makeToken({
      user: { id: 15, email: 'normal-user@example.com' },
      role: 'user',
    });

    const response = await request(app)
      .get('/api/health')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      user: {
        id: 15,
        email: 'normal-user@example.com',
        role: 'user',
      },
    });
  });
});
