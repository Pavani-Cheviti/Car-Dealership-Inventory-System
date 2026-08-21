import { pool } from '../config/database.js';

async function findAll() {
  const result = await pool.query('SELECT * FROM vehicles ORDER BY id ASC');
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function create(vehicle) {
  const result = await pool.query(
    `INSERT INTO vehicles (make, model, category, price, quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [vehicle.make, vehicle.model, vehicle.category, vehicle.price, vehicle.quantity]
  );
  return result.rows[0];
}

async function update(id, vehicle) {
  const result = await pool.query(
    `UPDATE vehicles
     SET make = $1, model = $2, category = $3, price = $4, quantity = $5, updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [vehicle.make, vehicle.model, vehicle.category, vehicle.price, vehicle.quantity, id]
  );
  return result.rows[0];
}

async function deleteVehicleById(id) {
  const result = await pool.query(
    `DELETE FROM vehicles
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

async function search({ make, model, category, minPrice, maxPrice } = {}) {
  const conditions = [];
  const values = [];

  if (make !== undefined && make !== null && make !== '') {
    conditions.push(`LOWER(make) LIKE $${values.length + 1}`);
    values.push(`%${String(make).toLowerCase()}%`);
  }

  if (model !== undefined && model !== null && model !== '') {
    conditions.push(`LOWER(model) LIKE $${values.length + 1}`);
    values.push(`%${String(model).toLowerCase()}%`);
  }

  if (category !== undefined && category !== null && category !== '') {
    conditions.push(`LOWER(category) LIKE $${values.length + 1}`);
    values.push(`%${String(category).toLowerCase()}%`);
  }

  if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
    conditions.push(`price >= $${values.length + 1}`);
    values.push(Number(minPrice));
  }

  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
    conditions.push(`price <= $${values.length + 1}`);
    values.push(Number(maxPrice));
  }

  const sql = conditions.length > 0
    ? `SELECT * FROM vehicles WHERE ${conditions.join(' AND ')} ORDER BY id ASC`
    : 'SELECT * FROM vehicles ORDER BY id ASC';

  const result = await pool.query(sql, values);
  return result.rows;
}

const defaultVehicleRepo = { findAll, findById, create, update, delete: deleteVehicleById, search };

export { findAll, findById, create, update, deleteVehicleById, search, defaultVehicleRepo };
