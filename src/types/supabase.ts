/**
 * Supabase Database TypeScript 타입 정의
 * 참조: supabase/migrations/ 전체
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
          paid_product_offset: number | null;
          show_paid_product_date: boolean;
          template_id: string;
          disclaimer: string;
          jira_project_key: string | null;
          jira_epic_template: string | null;
          jira_headsup_template: string | null;
          jira_headsup_description: string | null;
          jira_task_issue_type: string | null;
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
          paid_product_offset?: number | null;
          show_paid_product_date?: boolean;
          template_id: string;
          disclaimer?: string;
          jira_project_key?: string | null;
          jira_epic_template?: string | null;
          jira_headsup_template?: string | null;
          jira_headsup_description?: string | null;
          jira_task_issue_type?: string | null;
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
          paid_product_offset?: number | null;
          show_paid_product_date?: boolean;
          template_id?: string;
          disclaimer?: string;
          jira_project_key?: string | null;
          jira_epic_template?: string | null;
          jira_headsup_template?: string | null;
          jira_headsup_description?: string | null;
          jira_task_issue_type?: string | null;
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
          jira_summary_template: string | null;
          jira_subtask_issue_type: string | null;
          description: string;
          assignee: string;
          jira_description: string;
          jira_assignee_id: string | null;
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
          jira_summary_template?: string | null;
          jira_subtask_issue_type?: string | null;
          description?: string;
          assignee?: string;
          jira_description?: string;
          jira_assignee_id?: string | null;
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
          jira_summary_template?: string | null;
          jira_subtask_issue_type?: string | null;
          description?: string;
          assignee?: string;
          jira_description?: string;
          jira_assignee_id?: string | null;
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
      // 계산 결과 (002_calculation_results.sql)
      calculation_results: {
        Row: {
          id: string;
          project_id: string;
          update_date: string;
          heads_up_date: string;
          ios_review_date: string | null;
          paid_product_date: string | null;
          calculated_at: string;
          calculated_by: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          update_date: string;
          heads_up_date: string;
          ios_review_date?: string | null;
          paid_product_date?: string | null;
          calculated_at?: string;
          calculated_by: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          update_date?: string;
          heads_up_date?: string;
          ios_review_date?: string | null;
          paid_product_date?: string | null;
          calculated_at?: string;
          calculated_by?: string;
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
      // 스케줄 엔트리 (002_calculation_results.sql + 006b 확장)
      schedule_entries: {
        Row: {
          id: string;
          calculation_id: string;
          table_type: string;
          entry_index: number;
          stage_id: string;
          stage_name: string;
          start_datetime: string;
          end_datetime: string;
          parent_id: string | null;
          description: string;
          assignee: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          calculation_id: string;
          table_type: string;
          entry_index: number;
          stage_id: string;
          stage_name: string;
          start_datetime: string;
          end_datetime: string;
          parent_id?: string | null;
          description?: string;
          assignee?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          calculation_id?: string;
          table_type?: string;
          entry_index?: number;
          stage_id?: string;
          stage_name?: string;
          start_datetime?: string;
          end_datetime?: string;
          parent_id?: string | null;
          description?: string;
          assignee?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_calculation";
            columns: ["calculation_id"];
            referencedRelation: "calculation_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_parent_entry";
            columns: ["parent_id"];
            referencedRelation: "schedule_entries";
            referencedColumns: ["id"];
          }
        ];
      };
      // JIRA Epic 매핑 (002_phase0_5_and_phase1_jira_integration.sql)
      jira_epic_mappings: {
        Row: {
          id: string;
          project_id: string;
          update_date: string;
          epic_id: string;
          epic_key: string;
          epic_url: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          update_date: string;
          epic_id: string;
          epic_key: string;
          epic_url?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          update_date?: string;
          epic_id?: string;
          epic_key?: string;
          epic_url?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jira_epic_mappings_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      // JIRA Task 매핑 (002_phase0_5_and_phase1_jira_integration.sql)
      jira_task_mappings: {
        Row: {
          id: string;
          epic_mapping_id: string;
          stage_id: string;
          is_headsup: boolean;
          task_id: string;
          task_key: string;
          task_url: string | null;
          issue_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          epic_mapping_id: string;
          stage_id: string;
          is_headsup?: boolean;
          task_id: string;
          task_key: string;
          task_url?: string | null;
          issue_type: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          epic_mapping_id?: string;
          stage_id?: string;
          is_headsup?: boolean;
          task_id?: string;
          task_key?: string;
          task_url?: string | null;
          issue_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jira_task_mappings_epic_mapping_id_fkey";
            columns: ["epic_mapping_id"];
            referencedRelation: "jira_epic_mappings";
            referencedColumns: ["id"];
          }
        ];
      };
      // JIRA 담당자 (003_jira_assignees.sql)
      jira_assignees: {
        Row: {
          id: string;
          name: string;
          jira_account_id: string;
          order_index: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          jira_account_id: string;
          order_index: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          jira_account_id?: string;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Phase 2: 이메일 템플릿 (006_phase2_email_templates.sql)
      email_templates: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          subject_template: string;
          body_template: string;
          is_built_in: boolean;
          created_at: string;
          created_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          subject_template: string;
          body_template: string;
          is_built_in?: boolean;       // seed 트리거 전용. 프론트엔드에서 true 설정 금지
          created_by?: string | null;
        };
        Update: {
          name?: string;
          subject_template?: string;
          body_template?: string;
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
