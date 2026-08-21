import { pool } from '../config/database.js';

async function findByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function create(user) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, password_hash AS "passwordHash"`,
    [user.name, user.email, user.passwordHash, 'user']
  );
  return result.rows[0];
}

const defaultUserRepo = { findByEmail, create };

export { findByEmail, create, defaultUserRepo };
