import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Lazy database client.
 *
 * The pool is created on first use rather than at import time so that
 * `next build` (which imports route modules to collect metadata) never fails
 * on a machine where DATABASE_URL isn't set yet — e.g. Render's build step.
 */

const globalForDb = globalThis as typeof globalThis & {
  __geomasterPool?: Pool;
};

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add it in your hosting provider's environment variables."
    );
  }

  // Hosted Postgres (Render, Neon, Supabase, Heroku…) requires TLS, while a
  // local dev database usually doesn't.
  const isLocal =
    databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
  const wantsNoSsl = /[?&]sslmode=disable/.test(databaseUrl);

  return new Pool({
    connectionString: databaseUrl,
    ssl: isLocal || wantsNoSsl ? undefined : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });
}

export function getPool(): Pool {
  if (!globalForDb.__geomasterPool) {
    globalForDb.__geomasterPool = createPool();
  }
  return globalForDb.__geomasterPool;
}

let _db: NodePgDatabase | null = null;

function getDb(): NodePgDatabase {
  if (!_db) _db = drizzle(getPool());
  return _db;
}

/**
 * Proxy so existing `import { db } from "@/db"` call sites keep working while
 * the real connection is only established on the first query.
 */
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});
