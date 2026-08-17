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
          id: string;           // PRIMARY KEY VARCHAR(10) - Day chinh la short code (SHA256 Base64URL)
          original_url: string; // TEXT
          created_at: string;   // TIMESTAMPTZ
          click_count: number;  // INTEGER
        };
        Insert: {
          id: string;           // short code lam id
          original_url: string;
          created_at?: string;
          click_count?: number;
        };
        Update: {
          id?: string;
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