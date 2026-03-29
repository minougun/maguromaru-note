export interface Database {
  public: {
    Tables: {
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
      menu_item_statuses: {
        Row: {
          menu_item_id: string;
          status: "available" | "few" | "soldout" | "unset";
          updated_at: string;
        };
        Insert: {
          menu_item_id: string;
          status?: "available" | "few" | "soldout" | "unset";
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_item_statuses"]["Insert"]>;
        Relationships: [];
      };
      visit_logs: {
        Row: {
          id: string;
          user_id: string;
          menu_item_id: string;
          visited_at: string;
          memo: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          menu_item_id: string;
          visited_at?: string;
          memo?: string | null;
          photo_url?: string | null;
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
      store_status: {
        Row: {
          id: number;
          recommendation: string;
          status: "open" | "busy" | "closing_soon" | "closed" | "unset";
          status_note: string;
          weather_comment: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          recommendation?: string;
          status?: "open" | "busy" | "closing_soon" | "closed" | "unset";
          status_note?: string;
          weather_comment?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["store_status"]["Insert"]>;
        Relationships: [];
      };
      quiz_stats: {
        Row: {
          user_id: string;
          total_correct_answers: number;
          total_answered_questions: number;
          quizzes_completed: number;
          best_score: number;
          best_question_count: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_correct_answers?: number;
          total_answered_questions?: number;
          quizzes_completed?: number;
          best_score?: number;
          best_question_count?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["quiz_stats"]["Insert"]>;
        Relationships: [];
      };
      quiz_sessions: {
        Row: {
          id: string;
          user_id: string;
          question_count: number;
          question_ids: string[];
          score: number;
          submitted_at: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_count: number;
          question_ids: string[];
          score?: number;
          submitted_at?: string | null;
          created_at?: string;
          expires_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["quiz_sessions"]["Insert"]>;
        Relationships: [];
      };
      share_bonus_events: {
        Row: {
          id: string;
          user_id: string;
          target_type: "visit_log" | "quiz_session";
          target_id: string;
          channel: "x" | "line" | "instagram";
          bonus_visit_tenths: number;
          bonus_correct_tenths: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_type: "visit_log" | "quiz_session";
          target_id: string;
          channel: "x" | "line" | "instagram";
          bonus_visit_tenths?: number;
          bonus_correct_tenths?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["share_bonus_events"]["Insert"]>;
        Relationships: [];
      };
      anonymous_link_nonces: {
        Row: {
          id: string;
          from_user_id: string;
          nonce: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          nonce: string;
          expires_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["anonymous_link_nonces"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      user_collected_parts: {
        Row: {
          part_id: string;
          user_id: string;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
