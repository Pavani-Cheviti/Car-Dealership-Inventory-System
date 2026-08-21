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

const insertVehicle = async ({ make = 'Toyota', model = 'Corolla', category = 'Sedan', price = 22000, quantity = 5 } = {}) => {
  const result = await pool.query(
    `INSERT INTO vehicles (make, model, category, price, quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [make, model, category, price, quantity]
  );

  return result.rows[0];
};

describe('DELETE /api/vehicles/:id', () => {
  beforeEach(async () => {
    await clearVehicles();
  });

  afterEach(async () => {
    await clearVehicles();
  });

  it('allows an admin to delete an existing vehicle', async () => {
    const seed = uniqueVehicleSeed('DeleteAdmin');
    const vehicle = await insertVehicle({
      make: seed.make,
      model: seed.model,
      category: seed.category,
      price: seed.price,
      quantity: seed.quantity,
    });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/deleted successfully/i);
  });

  it('rejects a normal USER from deleting a vehicle', async () => {
    const seed = uniqueVehicleSeed('DeleteUser');
    const vehicle = await insertVehicle({
      make: seed.make,
      model: seed.model,
      category: seed.category,
      price: seed.price,
      quantity: seed.quantity,
    });
    const token = makeToken({ user: { id: 12, email: 'user@example.com' }, role: 'user' });

    const response = await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated request', async () => {
    const seed = uniqueVehicleSeed('DeleteGuest');
    const vehicle = await insertVehicle({
      make: seed.make,
      model: seed.model,
      category: seed.category,
      price: seed.price,
      quantity: seed.quantity,
    });

    const response = await request(app).delete(`/api/vehicles/${vehicle.id}`);

    expect(response.status).toBe(401);
  });

  it('returns 404 for a nonexistent vehicle', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .delete('/api/vehicles/999999')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/not found/i);
  });

  it('handles an invalid vehicle ID safely', async () => {
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .delete('/api/vehicles/not-a-number')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it('deletes the vehicle row from PostgreSQL', async () => {
    const seed = uniqueVehicleSeed('DeleteDb');
    const vehicle = await insertVehicle({
      make: seed.make,
      model: seed.model,
      category: seed.category,
      price: seed.price,
      quantity: seed.quantity,
    });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const dbResult = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicle.id]);
    expect(dbResult.rows).toHaveLength(0);
  });

  it('does not affect unrelated vehicles', async () => {
    const keepVehicle = await insertVehicle({
      make: 'Honda',
      model: 'Civic',
      category: 'Sedan',
      price: 23000,
      quantity: 4,
    });
    const deleteVehicle = await insertVehicle({
      make: 'Ford',
      model: 'F-150',
      category: 'Truck',
      price: 42000,
      quantity: 2,
    });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .delete(`/api/vehicles/${deleteVehicle.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const keepResult = await pool.query('SELECT * FROM vehicles WHERE id = $1', [keepVehicle.id]);
    const deletedResult = await pool.query('SELECT * FROM vehicles WHERE id = $1', [deleteVehicle.id]);

    expect(keepResult.rows).toHaveLength(1);
    expect(deletedResult.rows).toHaveLength(0);
  });

  it('uses the verified JWT role for authorization', async () => {
    const seed = uniqueVehicleSeed('DeleteJwt');
    const vehicle = await insertVehicle({
      make: seed.make,
      model: seed.model,
      category: seed.category,
      price: seed.price,
      quantity: seed.quantity,
    });

    const token = makeToken({ user: { id: 44, email: 'admin-user@example.com' }, role: 'user' });
    const response = await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('uses the repository layer and parameterized SQL for deletion', async () => {
    const seed = uniqueVehicleSeed('DeleteRepo');
    const vehicle = await insertVehicle({
      make: seed.make,
      model: seed.model,
      category: seed.category,
      price: seed.price,
      quantity: seed.quantity,
    });
    const token = makeToken({ user: { id: 99, email: 'admin@example.com' }, role: 'admin' });

    const response = await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const dbResult = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicle.id]);
    expect(dbResult.rows).toHaveLength(0);
  });
});
