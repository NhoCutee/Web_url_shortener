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
          short_code: string;   // VARCHAR(10) - SHA256 Base64URL
          original_url: string; // TEXT
          created_at: string;   // TIMESTAMPTZ
          click_count: number;  // INTEGER
        };
        Insert: {
          id?: string;
          short_code: string;
          original_url: string;
          created_at?: string;
          click_count?: number;
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

export type LinkRow = Database["public"]["Tables"]["links"]["Row"];
export type LinkInsert = Database["public"]["Tables"]["links"]["Insert"];