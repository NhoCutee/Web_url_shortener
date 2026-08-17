/**
 * supabase.ts - Supabase client factory
 *
 * Co 2 loai client:
 *   1. supabaseClient  - Dung o CLIENT component (browser), dung anon key
 *   2. supabaseServer  - Dung o API routes (server-side), dung service_role key
 *
 * Luu y quan trong ve Next.js:
 *   process.env.NEXT_PUBLIC_* phai duoc truy cap truc tiep (literal property access)
 *   de Webpack/Turbopack inline gia tri vao client bundle khi build.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://host.docker.internal:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Client-side Supabase client (dung anon key)
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

// Server-side Supabase client (dung service_role key)
// Chi goi function nay trong Server Components hoac API Routes
export function createServerSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Please check your .env.local file."
    );
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}