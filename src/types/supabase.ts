/**
 * Supabase Database TypeScript 타입 정의
 * 참조: supabase/migrations/001_initial_schema.sql
 *
 * 수동 작성 (Supabase CLI gen types 대체)
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
      holidays: {
        Row: {
          id: string;
          date: string;
          name: string;
          is_manual: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          name: string;
          is_manual?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          date?: string;
          name?: string;
          is_manual?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          heads_up_offset: number;
          ios_review_offset: number | null;
          show_ios_review_date: boolean;
          template_id: string;
          disclaimer: string;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id: string;
          name: string;
          heads_up_offset: number;
          ios_review_offset?: number | null;
          show_ios_review_date?: boolean;
          template_id: string;
          disclaimer?: string;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          name?: string;
          heads_up_offset?: number;
          ios_review_offset?: number | null;
          show_ios_review_date?: boolean;
          template_id?: string;
          disclaimer?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
        Relationships: [];
      };
      work_stages: {
        Row: {
          id: string;
          template_id: string;
          name: string;
          start_offset_days: number;
          end_offset_days: number;
          start_time: string;
          end_time: string;
          order: number;
          parent_stage_id: string | null;
          depth: number;
          table_targets: string[];
          created_at: string;
        };
        Insert: {
          id: string;
          template_id: string;
          name: string;
          start_offset_days: number;
          end_offset_days: number;
          start_time: string;
          end_time: string;
          order: number;
          parent_stage_id?: string | null;
          depth?: number;
          table_targets: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          name?: string;
          start_offset_days?: number;
          end_offset_days?: number;
          start_time?: string;
          end_time?: string;
          order?: number;
          parent_stage_id?: string | null;
          depth?: number;
          table_targets?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_template";
            columns: ["template_id"];
            referencedRelation: "work_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_parent_stage";
            columns: ["parent_stage_id"];
            referencedRelation: "work_stages";
            referencedColumns: ["id"];
          }
        ];
      };
      work_templates: {
        Row: {
          id: string;
          project_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          project_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_project";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
