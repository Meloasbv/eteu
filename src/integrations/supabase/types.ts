export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      favorite_verses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          reading_day: string
          user_code_id: string
          verse_reference: string
          verse_text: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          reading_day?: string
          user_code_id: string
          verse_reference: string
          verse_text: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          reading_day?: string
          user_code_id?: string
          verse_reference?: string
          verse_text?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          answer: string
          created_at: string
          ease_factor: number
          id: string
          interval: number
          next_review: string
          note_id: string | null
          question: string
          user_code_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          ease_factor?: number
          id?: string
          interval?: number
          next_review?: string
          note_id?: string | null
          question: string
          user_code_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          ease_factor?: number
          id?: string
          interval?: number
          next_review?: string
          note_id?: string | null
          question?: string
          user_code_id?: string
        }
        Relationships: []
      }
      mind_maps: {
        Row: {
          created_at: string
          edges: Json
          id: string
          nodes: Json
          source_type: string | null
          study_notes: Json | null
          title: string
          updated_at: string
          user_code_id: string
        }
        Insert: {
          created_at?: string
          edges?: Json
          id?: string
          nodes?: Json
          source_type?: string | null
          study_notes?: Json | null
          title?: string
          updated_at?: string
          user_code_id: string
        }
        Update: {
          created_at?: string
          edges?: Json
          id?: string
          nodes?: Json
          source_type?: string | null
          study_notes?: Json | null
          title?: string
          updated_at?: string
          user_code_id?: string
        }
        Relationships: []
      }
      note_shares: {
        Row: {
          created_at: string
          id: string
          note_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_shares_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          categoria: string
          created_at: string
          id: string
          semana: string
          texto: string
          updated_at: string
          user_code_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          id?: string
          semana?: string
          texto?: string
          updated_at?: string
          user_code_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          semana?: string
          texto?: string
          updated_at?: string
          user_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_code_id_fkey"
            columns: ["user_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      para_items: {
        Row: {
          color: string | null
          created_at: string
          deadline: string | null
          description: string | null
          icon: string | null
          id: string
          kind: string
          status: string
          title: string
          updated_at: string
          user_code_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          kind?: string
          status?: string
          title: string
          updated_at?: string
          user_code_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          kind?: string
          status?: string
          title?: string
          updated_at?: string
          user_code_id?: string
        }
        Relationships: []
      }
      para_links: {
        Row: {
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          id: string
          para_id: string
          user_code_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_label?: string | null
          entity_type: string
          id?: string
          para_id: string
          user_code_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_label?: string | null
          entity_type?: string
          id?: string
          para_id?: string
          user_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "para_links_para_id_fkey"
            columns: ["para_id"]
            isOneToOne: false
            referencedRelation: "para_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_progress: {
        Row: {
          attempts: number | null
          best_score: number | null
          completed: boolean | null
          created_at: string | null
          id: string
          last_attempt_at: string | null
          stage_id: number
          stars: number | null
          total_questions: number | null
          user_code_id: string
        }
        Insert: {
          attempts?: number | null
          best_score?: number | null
          completed?: boolean | null
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          stage_id: number
          stars?: number | null
          total_questions?: number | null
          user_code_id: string
        }
        Update: {
          attempts?: number | null
          best_score?: number | null
          completed?: boolean | null
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          stage_id?: number
          stars?: number | null
          total_questions?: number | null
          user_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_progress_user_code_id_fkey"
            columns: ["user_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          reminder_datetime: string
          repeat: string
          title: string
          user_code_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          reminder_datetime: string
          repeat?: string
          title: string
          user_code_id: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          reminder_datetime?: string
          repeat?: string
          title?: string
          user_code_id?: string
        }
        Relationships: []
      }
      study_flashcards: {
        Row: {
          back: string
          created_at: string
          difficulty: string
          ease_factor: number
          front: string
          id: string
          interval_days: number
          last_review: string | null
          mind_map_id: string | null
          next_review: string
          note_id: string
          repetitions: number
          type: string
          user_code_id: string
        }
        Insert: {
          back: string
          created_at?: string
          difficulty?: string
          ease_factor?: number
          front: string
          id?: string
          interval_days?: number
          last_review?: string | null
          mind_map_id?: string | null
          next_review?: string
          note_id: string
          repetitions?: number
          type?: string
          user_code_id: string
        }
        Update: {
          back?: string
          created_at?: string
          difficulty?: string
          ease_factor?: number
          front?: string
          id?: string
          interval_days?: number
          last_review?: string | null
          mind_map_id?: string | null
          next_review?: string
          note_id?: string
          repetitions?: number
          type?: string
          user_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_flashcards_mind_map_id_fkey"
            columns: ["mind_map_id"]
            isOneToOne: false
            referencedRelation: "mind_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      study_reviews: {
        Row: {
          cards_reviewed: number
          cards_total: number
          completed_at: string
          duration_seconds: number
          id: string
          mind_map_id: string | null
          review_type: string
          self_rating: number | null
          user_code_id: string
        }
        Insert: {
          cards_reviewed?: number
          cards_total?: number
          completed_at?: string
          duration_seconds?: number
          id?: string
          mind_map_id?: string | null
          review_type?: string
          self_rating?: number | null
          user_code_id: string
        }
        Update: {
          cards_reviewed?: number
          cards_total?: number
          completed_at?: string
          duration_seconds?: number
          id?: string
          mind_map_id?: string | null
          review_type?: string
          self_rating?: number | null
          user_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_reviews_mind_map_id_fkey"
            columns: ["mind_map_id"]
            isOneToOne: false
            referencedRelation: "mind_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      thought_connections: {
        Row: {
          connection_type: string
          created_at: string
          explanation: string | null
          id: string
          strength: number | null
          thought_a: string
          thought_b: string
          user_code_id: string
        }
        Insert: {
          connection_type?: string
          created_at?: string
          explanation?: string | null
          id?: string
          strength?: number | null
          thought_a: string
          thought_b: string
          user_code_id: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          explanation?: string | null
          id?: string
          strength?: number | null
          thought_a?: string
          thought_b?: string
          user_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thought_connections_thought_a_fkey"
            columns: ["thought_a"]
            isOneToOne: false
            referencedRelation: "thoughts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thought_connections_thought_b_fkey"
            columns: ["thought_b"]
            isOneToOne: false
            referencedRelation: "thoughts"
            referencedColumns: ["id"]
          },
        ]
      }
      thought_patterns: {
        Row: {
          bible_refs: string[] | null
          description: string | null
          detected_at: string
          id: string
          pattern_name: string
          thought_ids: string[] | null
          user_code_id: string
        }
        Insert: {
          bible_refs?: string[] | null
          description?: string | null
          detected_at?: string
          id?: string
          pattern_name: string
          thought_ids?: string[] | null
          user_code_id: string
        }
        Update: {
          bible_refs?: string[] | null
          description?: string | null
          detected_at?: string
          id?: string
          pattern_name?: string
          thought_ids?: string[] | null
          user_code_id?: string
        }
        Relationships: []
      }
      thoughts: {
        Row: {
          analysis: Json | null
          archived: boolean
          content: string
          created_at: string
          emotion_intensity: number | null
          emotion_valence: number | null
          id: string
          is_favorite: boolean | null
          keywords: string[] | null
          type: string
          updated_at: string
          user_code_id: string
        }
        Insert: {
          analysis?: Json | null
          archived?: boolean
          content: string
          created_at?: string
          emotion_intensity?: number | null
          emotion_valence?: number | null
          id?: string
          is_favorite?: boolean | null
          keywords?: string[] | null
          type?: string
          updated_at?: string
          user_code_id: string
        }
        Update: {
          analysis?: Json | null
          archived?: boolean
          content?: string
          created_at?: string
          emotion_intensity?: number | null
          emotion_valence?: number | null
          id?: string
          is_favorite?: boolean | null
          keywords?: string[] | null
          type?: string
          updated_at?: string
          user_code_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
