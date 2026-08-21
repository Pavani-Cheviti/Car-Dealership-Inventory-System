import { describe, it, expect } from 'vitest';
import { pool } from '../config/database.js';
import { runMigrations } from '../config/migrate.js';

describe('database foundation', () => {
  it('connects to PostgreSQL and initializes the users and vehicles tables with constraints', async () => {
    await runMigrations();

    const tablesResult = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('users', 'vehicles')
       ORDER BY table_name`
    );

    expect(tablesResult.rows.map((row) => row.table_name)).toEqual(['users', 'vehicles']);

    const usersColumns = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'
       ORDER BY ordinal_position`
    );

    const vehiclesColumns = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'vehicles'
       ORDER BY ordinal_position`
    );

    expect(usersColumns.rows.map((row) => row.column_name)).toEqual(
      expect.arrayContaining(['id', 'name', 'email', 'password_hash', 'role', 'created_at'])
    );

    expect(vehiclesColumns.rows.map((row) => row.column_name)).toEqual(
      expect.arrayContaining(['id', 'make', 'model', 'category', 'price', 'quantity', 'created_at', 'updated_at'])
    );

    const emailUnique = await pool.query(
      `SELECT conname
       FROM pg_constraint
       WHERE conrelid = 'public.users'::regclass
         AND contype = 'u'`
    );

    const roleCheck = await pool.query(
      `SELECT conname
       FROM pg_constraint
       WHERE conrelid = 'public.users'::regclass
         AND contype = 'c'`
    );

    const priceCheck = await pool.query(
      `SELECT conname
       FROM pg_constraint
       WHERE conrelid = 'public.vehicles'::regclass
         AND contype = 'c'`
    );

    expect(emailUnique.rows.length).toBeGreaterThan(0);
    expect(roleCheck.rows.length).toBeGreaterThan(0);
    expect(priceCheck.rows.length).toBeGreaterThan(0);

    const indexResult = await pool.query(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename IN ('users', 'vehicles')`
    );

    expect(indexResult.rows.length).toBeGreaterThan(0);
  });
});
