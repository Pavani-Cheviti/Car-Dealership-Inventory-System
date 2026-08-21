import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '../server.js';
import { pool } from '../config/database.js';

const buildVehiclePayload = (overrides = {}) => ({
  make: 'Toyota',
  model: 'Corolla',
  category: 'Sedan',
  price: 22000,
  quantity: 5,
  ...overrides,
});

const makeToken = ({ user = { id: 1, email: 'user@example.com' }, role = 'user' }) =>
  jwt.sign({ ...user, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

const cleanupVehicles = async (make, model) => {
  if (!make || !model) {
    return;
  }

  await pool.query('DELETE FROM vehicles WHERE make = $1 AND model = $2', [make, model]);
};

describe('POST /api/vehicles', () => {
  afterEach(async () => {
    await pool.query('DELETE FROM vehicles WHERE make = $1 AND model = $2', ['Toyota', 'Corolla']);
    await pool.query('DELETE FROM vehicles WHERE make = $1 AND model = $2', ['Honda', 'Civic']);
    await pool.query('DELETE FROM vehicles WHERE make = $1 AND model = $2', ['BMW', 'X5']);
    await pool.query('DELETE FROM vehicles WHERE make = $1 AND model = $2', ['Ford', 'F-150']);
  });

  it('allows an admin to create a vehicle', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });
    const payload = buildVehiclePayload({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      make: 'Toyota',
      model: 'Corolla',
      category: 'Sedan',
      price: '22000.00',
      quantity: 5,
    });
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app)
      .post('/api/vehicles')
      .send(buildVehiclePayload());

    expect(response.status).toBe(401);
  });

  it('rejects a normal USER from creating a vehicle', async () => {
    const token = makeToken({ user: { id: 77, email: 'user@example.com' }, role: 'user' });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(buildVehiclePayload({ make: 'Honda', model: 'Civic', category: 'Sedan', price: 20000, quantity: 2 }));

    expect(response.status).toBe(403);
  });

  it('rejects a vehicle with a missing make', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(buildVehiclePayload({ make: '' }));

    expect(response.status).toBe(400);
  });

  it('rejects a vehicle with a missing model', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(buildVehiclePayload({ model: '' }));

    expect(response.status).toBe(400);
  });

  it('rejects a vehicle with a missing category', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(buildVehiclePayload({ category: '' }));

    expect(response.status).toBe(400);
  });

  it('rejects an invalid or negative price', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(buildVehiclePayload({ price: -100 }));

    expect(response.status).toBe(400);
  });

  it('rejects an invalid or negative quantity', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(buildVehiclePayload({ quantity: -2 }));

    expect(response.status).toBe(400);
  });

  it('accepts a valid zero price', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(buildVehiclePayload({ make: 'BMW', model: 'X5', category: 'SUV', price: 0, quantity: 3 }));

    expect(response.status).toBe(201);
  });

  it('accepts a zero quantity for an initial out-of-stock vehicle', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(buildVehiclePayload({ make: 'Ford', model: 'F-150', category: 'Truck', price: 40000, quantity: 0 }));

    expect(response.status).toBe(201);
  });

  it('persists the created vehicle in PostgreSQL and returns it in the response', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });
    const payload = buildVehiclePayload({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');

    const dbResult = await pool.query('SELECT * FROM vehicles WHERE id = $1', [response.body.id]);
    expect(dbResult.rows).toHaveLength(1);
    expect(dbResult.rows[0]).toMatchObject({
      make: 'Toyota',
      model: 'Corolla',
      category: 'Sedan',
      price: '22000.00',
      quantity: 5,
    });
  });

  it('returns the database-generated vehicle ID', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(buildVehiclePayload({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 }));

    expect(response.status).toBe(201);
    expect(response.body.id).toBeTypeOf('number');
  });

  it('never includes password or token data in the vehicle response', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(buildVehiclePayload({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 }));

    expect(response.status).toBe(201);
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('password_hash');
    expect(response.body).not.toHaveProperty('token');
  });
});
