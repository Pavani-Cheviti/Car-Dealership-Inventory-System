import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import app from '../server.js';
import { pool } from '../config/database.js';

const makeToken = ({ user = { id: 1, email: 'user@example.com' }, role = 'user' }) =>
  jwt.sign({ ...user, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

const uniqueVehicleSeed = (prefix) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    make: `${prefix}-${suffix}`,
    model: `${prefix}-Model-${suffix}`,
    category: 'Sedan',
    price: 22000,
    quantity: 5,
  };
};

const clearVehicles = async () => {
  await pool.query('DELETE FROM vehicles');
};

const insertVehicle = async ({ make, model, category, price, quantity }) => {
  const result = await pool.query(
    `INSERT INTO vehicles (make, model, category, price, quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [make, model, category, price, quantity]
  );

  return result.rows[0];
};

describe('GET /api/vehicles/search', () => {
  beforeEach(async () => {
    await clearVehicles();
  });

  afterEach(async () => {
    await clearVehicles();
  });

  it('searches by make', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    const match = uniqueVehicleSeed('SearchMazda');
    await insertVehicle({ ...match, category: 'SUV', price: 35000, quantity: 4 });
    await insertVehicle({
      make: 'Toyota',
      model: 'Corolla',
      category: 'Sedan',
      price: 22000,
      quantity: 5,
    });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ make: match.make.split('-')[0] })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          make: match.make,
          model: match.model,
          category: 'SUV',
          price: '35000.00',
          quantity: 4,
        }),
      ])
    );
  });

  it('searches by model', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    const modelMatch = uniqueVehicleSeed('SearchModel');
    await insertVehicle({ ...modelMatch, category: 'Sedan', price: 28000, quantity: 2 });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ model: modelMatch.model.split('-')[0] })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          make: modelMatch.make,
          model: modelMatch.model,
        }),
      ])
    );
  });

  it('searches by category', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await insertVehicle({
      make: 'Honda',
      model: 'Civic',
      category: 'Sedan',
      price: 26000,
      quantity: 3,
    });
    await insertVehicle({
      make: 'Toyota',
      model: 'Camry',
      category: 'Sedan',
      price: 30000,
      quantity: 2,
    });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ category: 'Sedan' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.every((vehicle) => vehicle.category === 'Sedan')).toBe(true);
  });

  it('filters by minimum price', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await insertVehicle({ make: 'Mazda', model: 'CX-5', category: 'SUV', price: 35000, quantity: 3 });
    await insertVehicle({ make: 'Toyota', model: 'Prius', category: 'Hybrid', price: 22000, quantity: 5 });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ minPrice: 30000 })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.every((vehicle) => Number(vehicle.price) >= 30000)).toBe(true);
  });

  it('filters by maximum price', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await insertVehicle({ make: 'Mazda', model: 'CX-5', category: 'SUV', price: 35000, quantity: 3 });
    await insertVehicle({ make: 'Toyota', model: 'Prius', category: 'Hybrid', price: 22000, quantity: 5 });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ maxPrice: 25000 })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.every((vehicle) => Number(vehicle.price) <= 25000)).toBe(true);
  });

  it('supports combined filters', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    await insertVehicle({ make: 'Toyota', model: 'Camry', category: 'Sedan', price: 28000, quantity: 3 });
    await insertVehicle({ make: 'Honda', model: 'Civic', category: 'Sedan', price: 24000, quantity: 2 });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ make: 'Toyota', category: 'Sedan', minPrice: 21000, maxPrice: 29000 })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.every((vehicle) => vehicle.make === 'Toyota')).toBe(true);
    expect(response.body.every((vehicle) => Number(vehicle.price) >= 21000)).toBe(true);
    expect(response.body.every((vehicle) => Number(vehicle.price) <= 29000)).toBe(true);
  });

  it('returns an empty array when no vehicles match', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await insertVehicle({ make: 'Tesla', model: 'Model 3', category: 'EV', price: 42000, quantity: 1 });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ make: 'Ford', category: 'Truck' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns multiple matches for a valid search', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await insertVehicle({ make: 'Honda', model: 'Civic', category: 'Sedan', price: 26000, quantity: 4 });
    await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 5 });
    await insertVehicle({ make: 'Mazda', model: '3', category: 'Hatchback', price: 24000, quantity: 2 });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ category: 'Sedan' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
    expect(response.body.every((vehicle) => vehicle.category === 'Sedan')).toBe(true);
  });

  it('rejects invalid minPrice safely', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ minPrice: 'abc' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it('rejects invalid maxPrice safely', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ maxPrice: 'not-a-number' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it('rejects negative price filters', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ minPrice: -1 })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it('reads from PostgreSQL instead of a static array', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    const firstVehicle = await insertVehicle({
      make: 'SearchDBOne',
      model: 'DBOneModel',
      category: 'SUV',
      price: 46000,
      quantity: 2,
    });
    const secondVehicle = await insertVehicle({
      make: 'SearchDBTwo',
      model: 'DBTwoModel',
      category: 'SUV',
      price: 50000,
      quantity: 1,
    });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ category: 'SUV' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: firstVehicle.id, make: firstVehicle.make }),
        expect.objectContaining({ id: secondVehicle.id, make: secondVehicle.make }),
      ])
    );
  });

  it('allows an authenticated USER to search', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await insertVehicle({ make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 2 });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ make: 'Toyota' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
  });

  it('allows an authenticated ADMIN to search', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });
    await insertVehicle({ make: 'Honda', model: 'Civic', category: 'Sedan', price: 24000, quantity: 2 });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ make: 'Honda' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects an unauthenticated search request', async () => {
    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ make: 'Toyota' });

    expect(response.status).toBe(401);
  });
});
