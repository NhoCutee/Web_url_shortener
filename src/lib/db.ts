/**
 * db.ts - PostgreSQL connection pool
 * Thay the Supabase client, ket noi truc tiep vao PostgreSQL qua DATABASE_URL
 */

import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable");
}

// Dung Pool de tai su dung ket noi, tranh mo qua nhieu connection
const pool = new Pool({
  connectionString,
  ssl: ssl || undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export default pool;