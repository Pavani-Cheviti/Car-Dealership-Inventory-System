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

const defaultVehicleRepo = { findAll, findById, create, update, delete: deleteVehicleById };

export { findAll, findById, create, update, deleteVehicleById, defaultVehicleRepo };
