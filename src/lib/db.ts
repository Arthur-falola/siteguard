import { Pool } from 'pg';

/** Thrown by query() when DATABASE_URL is not configured. */
export class DbNotConfiguredError extends Error {
  constructor() {
    super(
      'DATABASE_URL is not set. Set DATABASE_URL to your PostgreSQL connection string to enable the database.',
    );
    this.name = 'DbNotConfiguredError';
  }
}

/**
 * Shared pg pool, or null when DATABASE_URL is unset. Callers must check
 * isDbConfigured() (or handle DbNotConfiguredError from query()) and render
 * an honest "Database not connected" state instead of fake data.
 */
export const pool: Pool | null = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

export function isDbConfigured(): boolean {
  return pool !== null;
}

/**
 * Run a parameterised query and return its rows.
 * Throws DbNotConfiguredError when DATABASE_URL is unset.
 */
export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!pool) {
    throw new DbNotConfiguredError();
  }
  // pg's values parameter is typed as any[]; never[] is assignable to it
  // and keeps this file free of `any`.
  const result = await pool.query(text, params as never[]);
  return result.rows as T[];
}
