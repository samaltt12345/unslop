import "dotenv/config";
import type { Config } from "drizzle-kit";

/**
 * Reads DATABASE_URL from the environment so the same config works locally
 * and on hosted platforms (Render, Railway, Neon, …).
 */
const url =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export default {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url,
    ssl:
      url.includes("localhost") || url.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
  },
} satisfies Config;
