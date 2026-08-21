import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
dotenv.config({ path: envPath });

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
