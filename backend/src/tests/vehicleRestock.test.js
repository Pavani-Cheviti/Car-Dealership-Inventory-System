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

describe('POST /api/vehicles/:id/restock', () => {
  beforeEach(async () => {
    await clearVehicles();
  });

  afterEach(async () => {
    await clearVehicles();
  });

  it('allows an admin to restock a vehicle', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 3 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 5 });

    expect(response.status).toBe(200);
    expect(response.body.quantity).toBe(8);
  });

  it('rejects a normal USER from restocking a vehicle', async () => {
    const vehicle = await insertVehicle({ make: 'Honda', model: 'Civic', category: 'Sedan', price: 24000, quantity: 2 });
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 5 });

    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated request', async () => {
    const vehicle = await insertVehicle({ make: 'Ford', model: 'Focus', category: 'Hatchback', price: 18000, quantity: 3 });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .send({ quantity: 5 });

    expect(response.status).toBe(401);
  });

  it('increases quantity by the valid positive restock amount', async () => {
    const vehicle = await insertVehicle({ make: 'Mazda', model: 'CX-5', category: 'SUV', price: 35000, quantity: 2 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 4 });

    expect(response.status).toBe(200);
    expect(response.body.quantity).toBe(6);
  });

  it('persists the increased quantity in PostgreSQL', async () => {
    const vehicle = await insertVehicle({ make: 'BMW', model: 'X3', category: 'SUV', price: 47000, quantity: 4 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 3 });

    expect(response.status).toBe(200);
    const dbResult = await pool.query('SELECT quantity FROM vehicles WHERE id = $1', [vehicle.id]);
    expect(Number(dbResult.rows[0].quantity)).toBe(7);
  });

  it('rejects a zero restock amount', async () => {
    const vehicle = await insertVehicle({ make: 'Tesla', model: 'Model Y', category: 'EV', price: 50000, quantity: 1 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 0 });

    expect(response.status).toBe(400);
  });

  it('rejects a negative restock amount', async () => {
    const vehicle = await insertVehicle({ make: 'Nissan', model: 'Leaf', category: 'EV', price: 30000, quantity: 2 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: -2 });

    expect(response.status).toBe(400);
  });

  it('rejects a non-numeric restock amount', async () => {
    const vehicle = await insertVehicle({ make: 'Subaru', model: 'Outback', category: 'SUV', price: 33000, quantity: 2 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 'abc' });

    expect(response.status).toBe(400);
  });

  it('returns 404 for a nonexistent vehicle', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post('/api/vehicles/999999/restock')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/not found/i);
  });

  it('handles an invalid vehicle ID safely', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post('/api/vehicles/not-a-number/restock')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 });

    expect(response.status).toBe(400);
  });

  it('never exposes password or auth fields in the restock response', async () => {
    const vehicle = await insertVehicle({ make: 'Kia', model: 'Sportage', category: 'SUV', price: 29000, quantity: 3 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 });

    expect(response.status).toBe(200);
    expect(response.body.password).toBeUndefined();
    expect(response.body.passwordHash).toBeUndefined();
    expect(response.body.token).toBeUndefined();
    expect(response.body.role).toBeUndefined();
  });

  it('does not modify unrelated vehicle records', async () => {
    const keepVehicle = await insertVehicle({ make: 'Honda', model: 'Accord', category: 'Sedan', price: 26000, quantity: 7 });
    const changeVehicle = await insertVehicle({ make: 'Toyota', model: 'RAV4', category: 'SUV', price: 36000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .post(`/api/vehicles/${changeVehicle.id}/restock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 3 });

    expect(response.status).toBe(200);

    const keepResult = await pool.query('SELECT quantity FROM vehicles WHERE id = $1', [keepVehicle.id]);
    const changedResult = await pool.query('SELECT quantity FROM vehicles WHERE id = $1', [changeVehicle.id]);

    expect(Number(keepResult.rows[0].quantity)).toBe(7);
    expect(Number(changedResult.rows[0].quantity)).toBe(8);
  });
});
