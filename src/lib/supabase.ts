/**
 * supabase.ts - Server-side Supabase client factory
 *
 * Toan bo thao tac doc/ghi Database deu duoc xu ly tap trung tai Server-side
 * thong qua createServerSupabaseClient() su dung service_role key.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://host.docker.internal:54321";

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