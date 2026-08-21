import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import app from '../server.js';
import { pool } from '../config/database.js';

const makeToken = ({ user = { id: 1, email: 'user@example.com' }, role = 'user' }) =>
  jwt.sign({ ...user, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

const clearVehicles = async () => {
  await pool.query('DELETE FROM vehicles');
};

const insertVehicle = async ({ make = 'Toyota', model = 'Corolla', category = 'Sedan', price = 22000, quantity = 5 } = {}) => {
  const result = await pool.query(
    `INSERT INTO vehicles (make, model, category, price, quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [make, model, category, price, quantity]
  );

  return result.rows[0];
};

describe('POST /api/vehicles/:id/purchase', () => {
  beforeEach(async () => {
    await clearVehicles();
  });

  afterEach(async () => {
    await clearVehicles();
  });

  it('allows an authenticated USER to purchase an in-stock vehicle', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 2 });
    const token = makeToken({ user: { id: 10, email: 'buyer@example.com' }, role: 'user' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/purchase`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.quantity).toBe(1);
  });

  it('allows an ADMIN to purchase when authenticated', async () => {
    const vehicle = await insertVehicle({ make: 'Honda', model: 'Civic', category: 'Sedan', price: 25000, quantity: 4 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/purchase`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.quantity).toBe(3);
  });

  it('rejects an unauthenticated purchase request', async () => {
    const vehicle = await insertVehicle({ make: 'Ford', model: 'Focus', category: 'Hatchback', price: 18000, quantity: 3 });

    const response = await request(app).post(`/api/vehicles/${vehicle.id}/purchase`);

    expect(response.status).toBe(401);
  });

  it('returns 404 for a nonexistent vehicle', async () => {
    const token = makeToken({ user: { id: 22, email: 'buyer@example.com' }, role: 'user' });

    const response = await request(app)
      .post('/api/vehicles/999999/purchase')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/not found/i);
  });

  it('rejects purchases when quantity is zero', async () => {
    const vehicle = await insertVehicle({ make: 'Tesla', model: 'Model 3', category: 'EV', price: 42000, quantity: 0 });
    const token = makeToken({ user: { id: 7, email: 'buyer@example.com' }, role: 'user' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/purchase`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/no vehicles available|out of stock/i);
  });

  it('reduces the quantity by exactly 1 after a successful purchase', async () => {
    const vehicle = await insertVehicle({ make: 'Mazda', model: 'CX-5', category: 'SUV', price: 35000, quantity: 3 });
    const token = makeToken({ user: { id: 11, email: 'buyer@example.com' }, role: 'user' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/purchase`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.quantity).toBe(2);

    const dbResult = await pool.query('SELECT quantity FROM vehicles WHERE id = $1', [vehicle.id]);
    expect(Number(dbResult.rows[0].quantity)).toBe(2);
  });

  it('does not allow quantity to fall below zero', async () => {
    const vehicle = await insertVehicle({ make: 'BMW', model: 'X3', category: 'SUV', price: 47000, quantity: 0 });
    const token = makeToken({ user: { id: 14, email: 'buyer@example.com' }, role: 'user' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/purchase`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);

    const dbResult = await pool.query('SELECT quantity FROM vehicles WHERE id = $1', [vehicle.id]);
    expect(Number(dbResult.rows[0].quantity)).toBe(0);
  });

  it('handles an invalid vehicle ID safely', async () => {
    const token = makeToken({ user: { id: 16, email: 'buyer@example.com' }, role: 'user' });

    const response = await request(app)
      .post('/api/vehicles/not-a-number/purchase')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it('prevents overselling when two purchases hit the same final vehicle simultaneously', async () => {
    const vehicle = await insertVehicle({ make: 'Nissan', model: 'Altima', category: 'Sedan', price: 26000, quantity: 1 });
    const token = makeToken({ user: { id: 18, email: 'buyer@example.com' }, role: 'user' });

    const requests = [
      request(app).post(`/api/vehicles/${vehicle.id}/purchase`).set('Authorization', `Bearer ${token}`),
      request(app).post(`/api/vehicles/${vehicle.id}/purchase`).set('Authorization', `Bearer ${token}`),
    ];

    const responses = await Promise.all(requests);
    const successful = responses.filter((response) => response.status === 200);
    const failures = responses.filter((response) => response.status !== 200);

    expect(successful).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].status).toBe(400);

    const dbResult = await pool.query('SELECT quantity FROM vehicles WHERE id = $1', [vehicle.id]);
    expect(Number(dbResult.rows[0].quantity)).toBe(0);
  });
});
