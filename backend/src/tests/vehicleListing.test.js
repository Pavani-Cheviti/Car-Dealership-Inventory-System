import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import app from '../server.js';
import { pool } from '../config/database.js';

const makeToken = ({ user = { id: 1, email: 'user@example.com' }, role = 'user' }) =>
  jwt.sign({ ...user, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

const seedVehicles = async () => {
  await pool.query(
    `INSERT INTO vehicles (make, model, category, price, quantity) VALUES
      ('Toyota', 'Camry', 'Sedan', 24000, 4),
      ('Honda', 'Civic', 'Sedan', 22000, 2),
      ('Tesla', 'Model 3', 'EV', 42000, 1)
    ON CONFLICT DO NOTHING`
  );
};

describe('GET /api/vehicles', () => {
  afterEach(async () => {
    await pool.query('DELETE FROM vehicles WHERE make IN ($1, $2, $3)', ['Toyota', 'Honda', 'Tesla']);
  });

  it('allows an authenticated USER to list vehicles', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await seedVehicles();

    const response = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('allows an authenticated ADMIN to list vehicles', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });
    await seedVehicles();

    const response = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('rejects an unauthenticated listing request', async () => {
    const response = await request(app).get('/api/vehicles');

    expect(response.status).toBe(401);
  });

  it('returns vehicles stored in PostgreSQL', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await seedVehicles();

    const response = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${token}`);

    const makes = response.body.map((vehicle) => vehicle.make);
    expect(makes).toEqual(expect.arrayContaining(['Toyota', 'Honda', 'Tesla']));
  });

  it('returns multiple vehicles correctly', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await seedVehicles();

    const response = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${token}`);

    expect(response.body.length).toBeGreaterThanOrEqual(3);
    expect(response.body.every((vehicle) => typeof vehicle.id === 'number')).toBe(true);
  });

  it('returns an empty array when no vehicles exist', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await pool.query('DELETE FROM vehicles');

    const response = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toEqual([]);
  });

  it('does not expose password or auth data in the listing response', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await seedVehicles();

    const response = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body[0]).not.toHaveProperty('passwordHash');
    expect(response.body[0]).not.toHaveProperty('password_hash');
    expect(response.body[0]).not.toHaveProperty('token');
  });

  it('returns the expected vehicle fields', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await seedVehicles();

    const response = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${token}`);

    const firstVehicle = response.body[0];
    expect(firstVehicle).toHaveProperty('id');
    expect(firstVehicle).toHaveProperty('make');
    expect(firstVehicle).toHaveProperty('model');
    expect(firstVehicle).toHaveProperty('category');
    expect(firstVehicle).toHaveProperty('price');
    expect(firstVehicle).toHaveProperty('quantity');
  });

  it('does not use a static JavaScript array as the source of truth', async () => {
    const token = makeToken({ user: { id: 10, email: 'user@example.com' }, role: 'user' });
    await pool.query('DELETE FROM vehicles');
    await pool.query(
      `INSERT INTO vehicles (make, model, category, price, quantity) VALUES
        ('Mazda', 'MX-5', 'Roadster', 31000, 7)`
    );

    const response = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          make: 'Mazda',
          model: 'MX-5',
          category: 'Roadster',
          price: '31000.00',
          quantity: 7,
        }),
      ])
    );
  });
});
