import { betterAuth } from "better-auth";
import { Pool } from "pg";

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.development.example to .env.development and configure your Supabase connection string.",
    );
  }
  const isSupabase = connectionString.includes("supabase");
  return new Pool({
    connectionString,
    ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

// Lazy pool — created on first request, not at import/build time.
let _pool: Pool | null = null;
function getPool() {
  if (!_pool) _pool = createPool();
  return _pool;
}

const trustedOrigins = [
  "http://localhost:2026", // nginx proxy
  "http://localhost:3000", // direct Next.js
];
// Add all Vercel system URL env vars (each deploy gets unique URLs)
for (const key of ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]) {
  const val = process.env[key];
  if (val) trustedOrigins.push(`https://${val}`);
}
// Allow custom origins via comma-separated env var
const extraOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
if (extraOrigins) {
  trustedOrigins.push(...extraOrigins.split(",").map((o) => o.trim()).filter(Boolean));
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  trustedOrigins,
  database: {
    // Proxy object so the pool is created lazily at request time, not build time.
    query: (...args: Parameters<Pool["query"]>) => getPool().query(...args),
    connect: (...args: Parameters<Pool["connect"]>) => getPool().connect(...args),
  } as unknown as Pool,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});

export type Session = typeof auth.$Infer.Session;
