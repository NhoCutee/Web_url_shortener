/**
 * supabase.ts - Supabase client factory
 *
 * Co 2 loai client:
 *   1. supabaseClient  - Dung o CLIENT component (browser), dung anon key
 *   2. supabaseServer  - Dung o API routes (server-side), dung service_role key
 *
 * Tai sao phan biet?
 *   - anon key: co Row Level Security (RLS) - an toan expose ra browser
 *   - service_role key: BYPASS tat ca RLS - chi dung tren server, TUYET DOI
 *     khong expose ra client-side (NEXT_PUBLIC_*)
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ----------------------------------------------------------------
// Validate bien moi truong bat buoc
// Neu thieu se throw loi ngay khi app khoi dong (fail fast)
// ----------------------------------------------------------------
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Please check your .env.local file (see .env.example for reference).`
    );
  }
  return value;
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// ----------------------------------------------------------------
// Client-side Supabase client (dung anon key)
// Singleton pattern: chi tao 1 instance cho toan bo app
// ----------------------------------------------------------------
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

// ----------------------------------------------------------------
// Server-side Supabase client (dung service_role key)
// Chi goi function nay trong Server Components hoac API Routes
// KHONG bao gio export sang client component
// ----------------------------------------------------------------
export function createServerSupabaseClient() {
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      // Server client khong can persist session
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
