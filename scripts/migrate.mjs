// Applies all SQL migrations in db/migrations/*.sql, in filename order.
// Tracks applied files in a `_migrations` table so re-runs are safe.
//
// Usage:  DATABASE_URL=postgres://... node scripts/migrate.mjs
// Exits non-zero with a clear message if DATABASE_URL is unset or a
// migration fails.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    'Error: DATABASE_URL is not set. Set it to your PostgreSQL connection string, e.g.\n' +
      '  DATABASE_URL=postgres://user:password@localhost:5432/siteguard node scripts/migrate.mjs',
  );
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

const pool = new Pool({ connectionString: DATABASE_URL });

try {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`,
  );

  const appliedResult = await pool.query('SELECT filename FROM _migrations');
  const applied = new Set(appliedResult.rows.map((row) => row.filename));

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log(`No migrations found in ${migrationsDir}.`);
  }

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping already-applied migration: ${file}`);
      continue;
    }
    console.log(`Applying migration: ${file}`);
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
    console.log(`Applied migration: ${file}`);
  }

  console.log('Migrations complete.');
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
