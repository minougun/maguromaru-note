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
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      parts: {
        Row: {
          id: string;
          name: string;
          area: string;
          rarity: number;
          description: string;
          color: string;
          sort_order: number;
        };
        Insert: {
          id: string;
          name: string;
          area: string;
          rarity: number;
          description: string;
          color: string;
          sort_order: number;
        };
        Update: Partial<Database["public"]["Tables"]["parts"]["Insert"]>;
        Relationships: [];
      };
      visit_logs: {
        Row: {
          id: string;
          user_id: string;
          visited_at: string;
          photo_url: string | null;
          memo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          visited_at: string;
          photo_url?: string | null;
          memo?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["visit_logs"]["Insert"]>;
        Relationships: [];
      };
      visit_log_parts: {
        Row: {
          id: string;
          visit_log_id: string;
          part_id: string;
        };
        Insert: {
          id?: string;
          visit_log_id: string;
          part_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["visit_log_parts"]["Insert"]>;
        Relationships: [];
      };
      titles: {
        Row: {
          id: string;
          name: string;
          icon: string;
          required_visits: number;
          sort_order: number;
        };
        Insert: {
          id: string;
          name: string;
          icon: string;
          required_visits: number;
          sort_order: number;
        };
        Update: Partial<Database["public"]["Tables"]["titles"]["Insert"]>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          name: string;
          price: number;
          sort_order: number;
        };
        Insert: {
          id: string;
          name: string;
          price: number;
          sort_order: number;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
        Relationships: [];
      };
      menu_status: {
        Row: {
          id: string;
          menu_item_id: string;
          status: "available" | "few" | "soldout";
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          status: "available" | "few" | "soldout";
          updated_at?: string;
          updated_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_status"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
