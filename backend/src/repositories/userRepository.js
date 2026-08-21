import { pool } from '../config/database.js';

async function findByEmail(email) {
  const result = await pool.query(
    `SELECT id, name, email, role, password_hash AS "passwordHash"
     FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

async function create(user) {
  const { name, email, passwordHash, role = 'user' } = user;
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, password_hash AS "passwordHash"`,
    [name, email, passwordHash, role]
  );
  return result.rows[0];
}

const defaultUserRepo = { findByEmail, create };

export { findByEmail, create, defaultUserRepo };
