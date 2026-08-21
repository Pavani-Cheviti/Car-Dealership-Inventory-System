import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '../server.js';
import { pool } from '../config/database.js';

const makeToken = ({ user = { id: 1, email: 'user@example.com' }, role = 'user' }) =>
  jwt.sign({ ...user, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

const insertVehicle = async ({ make = 'Toyota', model = 'Corolla', category = 'Sedan', price = 22000, quantity = 5 } = {}) => {
  const result = await pool.query(
    `INSERT INTO vehicles (make, model, category, price, quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [make, model, category, price, quantity]
  );

  return result.rows[0];
};

describe('PUT /api/vehicles/:id', () => {
  afterEach(async () => {
    await pool.query("DELETE FROM vehicles WHERE make IN ('Toyota', 'Honda', 'BMW', 'Ford', 'Mazda')");
  });

  it('allows an admin to update an existing vehicle', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Toyota', model: 'Camry', category: 'Sedan', price: 25000, quantity: 3 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: vehicle.id,
      make: 'Toyota',
      model: 'Camry',
      category: 'Sedan',
      price: '25000.00',
      quantity: 3,
    });
  });

  it('rejects a normal USER from updating a vehicle', async () => {
    const vehicle = await insertVehicle({ make: 'Honda', model: 'Civic', category: 'Sedan', price: 21000, quantity: 2 });
    const token = makeToken({ user: { id: 12, email: 'user@example.com' }, role: 'user' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Honda', model: 'Accord', price: 22000, quantity: 4 });

    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated request', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .send({ make: 'Toyota', model: 'Camry', price: 25000, quantity: 3 });

    expect(response.status).toBe(401);
  });

  it('updates the make field', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Mazda' });

    expect(response.status).toBe(200);
    expect(response.body.make).toBe('Mazda');
  });

  it('updates the model field', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ model: 'Camry' });

    expect(response.status).toBe(200);
    expect(response.body.model).toBe('Camry');
  });

  it('updates the category field', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'SUV' });

    expect(response.status).toBe(200);
    expect(response.body.category).toBe('SUV');
  });

  it('updates the price field', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 26000 });

    expect(response.status).toBe(200);
    expect(response.body.price).toBe('26000.00');
  });

  it('updates the quantity field', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 9 });

    expect(response.status).toBe(200);
    expect(response.body.quantity).toBe(9);
  });

  it('handles valid partial updates according to the current API design', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 27000 });

    expect(response.status).toBe(200);
    expect(response.body.model).toBe('Corolla');
    expect(response.body.price).toBe('27000.00');
  });

  it('returns 404 for a nonexistent vehicle', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put('/api/vehicles/999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Ford' });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/not found/i);
  });

  it('rejects a negative price', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: -1 });

    expect(response.status).toBe(400);
  });

  it('rejects a negative quantity', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: -1 });

    expect(response.status).toBe(400);
  });

  it('handles an invalid vehicle ID safely', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put('/api/vehicles/not-a-number')
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Ford' });

    expect(response.status).toBe(400);
  });

  it('persists updated values in PostgreSQL', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'BMW', model: 'X5', category: 'SUV', price: 50000, quantity: 7 });

    expect(response.status).toBe(200);

    const dbResult = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicle.id]);
    expect(dbResult.rows[0]).toMatchObject({
      make: 'BMW',
      model: 'X5',
      category: 'SUV',
      price: '50000.00',
      quantity: 7,
    });
  });

  it('returns the updated vehicle in the response', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Ford', model: 'Mustang', category: 'Coupe', price: 30000, quantity: 4 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: vehicle.id,
      make: 'Ford',
      model: 'Mustang',
      category: 'Coupe',
      price: '30000.00',
      quantity: 4,
    });
  });

  it('never exposes password or auth data in the update response', async () => {
    const vehicle = await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Toyota', model: 'Prius', price: 24000, quantity: 2 });

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('password_hash');
    expect(response.body).not.toHaveProperty('token');
  });
});
