import { pool } from './database.js';

const migrations = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      make VARCHAR(255) NOT NULL,
      model VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
      quantity INTEGER NOT NULL CHECK (quantity >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles (make);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles (model);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles (category);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles (price);
  `,
];

async function runMigrations() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const statement of migrations) {
      await client.query(statement);
    }

    await client.query('COMMIT');
    return { ok: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function resetDatabase() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS vehicles');
    await client.query('DROP TABLE IF EXISTS users');
    await client.query('COMMIT');
    return runMigrations();
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.includes('migrate.js')) {
  const action = process.argv[2];

  try {
    if (action === 'reset') {
      await resetDatabase();
      console.log('Database reset and migrations complete.');
    } else {
      await runMigrations();
      console.log('Database migrations complete.');
    }
  } catch (error) {
    console.error('Database migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

export { runMigrations, resetDatabase };
