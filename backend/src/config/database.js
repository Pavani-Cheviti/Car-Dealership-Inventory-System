import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required. Set it to your PostgreSQL connection string before starting the backend.');
}

const pool = new Pool({
  connectionString,
  ssl: false,
});

export { pool };
