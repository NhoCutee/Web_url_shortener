/**
 * database.ts - TypeScript types cho Supabase schema
 *
 * File nay mo ta cau truc bang trong Postgres de TypeScript
 * co the type-check cac query Supabase.
 *
 * Trong du an that, co the dung "supabase gen-types typescript"
 * de tu dong sinh file nay tu schema thuc te.
 * Lenh: npx supabase gen-types typescript --local > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      links: {
        Row: {
          id: string;           // UUID
          short_code: string;   // VARCHAR(7)
          original_url: string; // TEXT
          created_at: string;   // TIMESTAMPTZ (Supabase tra ve string ISO)
          click_count: number;  // INTEGER
        };
        Insert: {
          id?: string;          // Optional: Postgres tu sinh neu khong truyen
          short_code: string;
          original_url: string;
          created_at?: string;  // Optional: DEFAULT NOW()
          click_count?: number; // Optional: DEFAULT 0
        };
        Update: {
          id?: string;
          short_code?: string;
          original_url?: string;
          created_at?: string;
          click_count?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience types
export type LinkRow = Database["public"]["Tables"]["links"]["Row"];
export type LinkInsert = Database["public"]["Tables"]["links"]["Insert"];
