/**
 * db.ts - PostgreSQL connection pool
 * Ket noi truc tiep vao PostgreSQL (Docker Local hoac Aiven Cloud) qua DATABASE_URL
 */

import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable");
}

// Tu dong nhan dien SSL neu co DATABASE_SSL=true hoac domain Aiven/Supabase
const isSsl =
  process.env.DATABASE_SSL === "true" ||
  connectionString.includes("sslmode=require") ||
  connectionString.includes("aivencloud.com");

// Bo query param ?sslmode=... khoi connection string de tranh pg driver enforce cert validation
const cleanConnectionString = connectionString.replace(/[\?&]sslmode=[^&]+/, "");

// Dung Pool de tai su dung ket noi, rejectUnauthorized: false cho Aiven cert
const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: isSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export default pool;