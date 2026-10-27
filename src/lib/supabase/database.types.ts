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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assessment_results: {
        Row: {
          confirmed_by: string | null
          evidence_ref: string | null
          learner_id: string
          result: Database["public"]["Enums"]["assessment_result_enum"]
          result_id: string
          standard_type: Database["public"]["Enums"]["assessment_standard"]
          tested_at: string | null
        }
        Insert: {
          confirmed_by?: string | null
          evidence_ref?: string | null
          learner_id: string
          result: Database["public"]["Enums"]["assessment_result_enum"]
          result_id?: string
          standard_type: Database["public"]["Enums"]["assessment_standard"]
          tested_at?: string | null
        }
        Update: {
          confirmed_by?: string | null
          evidence_ref?: string | null
          learner_id?: string
          result?: Database["public"]["Enums"]["assessment_result_enum"]
          result_id?: string
          standard_type?: Database["public"]["Enums"]["assessment_standard"]
          tested_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["learner_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          changed_fields: string[] | null
          entity_type: string
          log_id: string
          occurred_at: string
          record_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          changed_fields?: string[] | null
          entity_type: string
          log_id?: string
          occurred_at?: string
          record_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          changed_fields?: string[] | null
          entity_type?: string
          log_id?: string
          occurred_at?: string
          record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_records: {
        Row: {
          certificate_ref: string | null
          certification_id: string
          certified_at: string | null
          enrollment_id: string
        }
        Insert: {
          certificate_ref?: string | null
          certification_id?: string
          certified_at?: string | null
          enrollment_id: string
        }
        Update: {
          certificate_ref?: string | null
          certification_id?: string
          certified_at?: string | null
          enrollment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_records_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["enrollment_id"]
          },
        ]
      }
      class_instructors: {
        Row: {
          class_id: string
          instructor_id: string
          role_in_class: string | null
        }
        Insert: {
          class_id: string
          instructor_id: string
          role_in_class?: string | null
        }
        Update: {
          class_id?: string
          instructor_id?: string
          role_in_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_instructors_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["instructor_id"]
          },
        ]
      }
      classes: {
        Row: {
          batch_code: string | null
          class_id: string
          course_id: string
          created_at: string
          end_date: string
          external_ref: string | null
          lead_instructor_id: string | null
          location: string | null
          mode: string | null
          name: string | null
          note: string | null
          schedule_time: string | null
          seat_count: number
          start_date: string
          status: string
          unit_id: string
        }
        Insert: {
          batch_code?: string | null
          class_id?: string
          course_id: string
          created_at?: string
          end_date: string
          external_ref?: string | null
          lead_instructor_id?: string | null
          location?: string | null
          mode?: string | null
          name?: string | null
          note?: string | null
          schedule_time?: string | null
          seat_count: number
          start_date: string
          status?: string
          unit_id: string
        }
        Update: {
          batch_code?: string | null
          class_id?: string
          course_id?: string
          created_at?: string
          end_date?: string
          external_ref?: string | null
          lead_instructor_id?: string | null
          location?: string | null
          mode?: string | null
          name?: string | null
          note?: string | null
          schedule_time?: string | null
          seat_count?: number
          start_date?: string
          status?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "classes_lead_instructor_id_fkey"
            columns: ["lead_instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["instructor_id"]
          },
          {
            foreignKeyName: "classes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "training_units"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      courses: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          name: string
          practical_hours: number | null
          source_doc_ref: string | null
          theory_hours: number | null
          total_hours: number
        }
        Insert: {
          course_id?: string
          created_at?: string
          description?: string | null
          name: string
          practical_hours?: number | null
          source_doc_ref?: string | null
          theory_hours?: number | null
          total_hours: number
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          name?: string
          practical_hours?: number | null
          source_doc_ref?: string | null
          theory_hours?: number | null
          total_hours?: number
        }
        Relationships: []
      }
      districts: {
        Row: {
          district_id: string
          name: string
          province_id: string
        }
        Insert: {
          district_id: string
          name: string
          province_id: string
        }
        Update: {
          district_id?: string
          name?: string
          province_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["province_id"]
          },
        ]
      }
      email_change_requests: {
        Row: {
          current_email: string
          decided_at: string | null
          decided_by: string | null
          reject_reason: string | null
          request_id: string
          requested_at: string
          requested_email: string
          status: string
          user_id: string
        }
        Insert: {
          current_email: string
          decided_at?: string | null
          decided_by?: string | null
          reject_reason?: string | null
          request_id?: string
          requested_at?: string
          requested_email: string
          status?: string
          user_id: string
        }
        Update: {
          current_email?: string
          decided_at?: string | null
          decided_by?: string | null
          reject_reason?: string | null
          request_id?: string
          requested_at?: string
          requested_email?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_change_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_change_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          applied_at: string
          class_id: string
          enrollment_id: string
          learner_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
        }
        Insert: {
          applied_at?: string
          class_id: string
          enrollment_id?: string
          learner_id: string
          status?: Database["public"]["Enums"]["enrollment_status"]
        }
        Update: {
          applied_at?: string
          class_id?: string
          enrollment_id?: string
          learner_id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "enrollments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["learner_id"]
          },
        ]
      }
      import_errors: {
        Row: {
          column_name: string | null
          error_id: string
          job_id: string
          reason: string
          row_number: number
        }
        Insert: {
          column_name?: string | null
          error_id?: string
          job_id: string
          reason: string
          row_number: number
        }
        Update: {
          column_name?: string | null
          error_id?: string
          job_id?: string
          reason?: string
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          failed_rows: number | null
          file_name: string
          job_id: string
          passed_rows: number | null
          status: Database["public"]["Enums"]["import_job_status"]
          total_rows: number | null
          uploaded_by: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          failed_rows?: number | null
          file_name: string
          job_id?: string
          passed_rows?: number | null
          status?: Database["public"]["Enums"]["import_job_status"]
          total_rows?: number | null
          uploaded_by: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          failed_rows?: number | null
          file_name?: string
          job_id?: string
          passed_rows?: number | null
          status?: Database["public"]["Enums"]["import_job_status"]
          total_rows?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          email: string | null
          instructor_id: string
          name: string
          phone: string | null
          unit_id: string | null
        }
        Insert: {
          email?: string | null
          instructor_id?: string
          name: string
          phone?: string | null
          unit_id?: string | null
        }
        Update: {
          email?: string | null
          instructor_id?: string
          name?: string
          phone?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructors_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "training_units"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      learners: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          created_by: string
          district_id: string | null
          email: string | null
          external_ref: string | null
          first_name: string
          last_name: string
          learner_id: string
          national_id_encrypted: string
          national_id_hash: string
          phone: string | null
          province_id: string | null
          source: Database["public"]["Enums"]["learner_source"]
          subdistrict_id: string | null
          unit_id: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          created_by: string
          district_id?: string | null
          email?: string | null
          external_ref?: string | null
          first_name: string
          last_name: string
          learner_id?: string
          national_id_encrypted: string
          national_id_hash: string
          phone?: string | null
          province_id?: string | null
          source: Database["public"]["Enums"]["learner_source"]
          subdistrict_id?: string | null
          unit_id: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string
          district_id?: string | null
          email?: string | null
          external_ref?: string | null
          first_name?: string
          last_name?: string
          learner_id?: string
          national_id_encrypted?: string
          national_id_hash?: string
          phone?: string | null
          province_id?: string | null
          source?: Database["public"]["Enums"]["learner_source"]
          subdistrict_id?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learners_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["district_id"]
          },
          {
            foreignKeyName: "learners_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["province_id"]
          },
          {
            foreignKeyName: "learners_subdistrict_id_fkey"
            columns: ["subdistrict_id"]
            isOneToOne: false
            referencedRelation: "subdistricts"
            referencedColumns: ["subdistrict_id"]
          },
          {
            foreignKeyName: "learners_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "training_units"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      participation_rounds: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          deadline: string | null
          fiscal_year: number
          notice_message: string | null
          opened_at: string
          opened_by: string | null
          round_id: string
          status: Database["public"]["Enums"]["round_status"]
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          deadline?: string | null
          fiscal_year: number
          notice_message?: string | null
          opened_at?: string
          opened_by?: string | null
          round_id?: string
          status?: Database["public"]["Enums"]["round_status"]
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          deadline?: string | null
          fiscal_year?: number
          notice_message?: string | null
          opened_at?: string
          opened_by?: string | null
          round_id?: string
          status?: Database["public"]["Enums"]["round_status"]
        }
        Relationships: [
          {
            foreignKeyName: "participation_rounds_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_rounds_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          id: string
          last_login_at: string | null
          mfa_enabled: boolean
          must_change_password: boolean
          role: Database["public"]["Enums"]["user_role"]
          unit_scope: string | null
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id: string
          last_login_at?: string | null
          mfa_enabled?: boolean
          must_change_password?: boolean
          role: Database["public"]["Enums"]["user_role"]
          unit_scope?: string | null
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          last_login_at?: string | null
          mfa_enabled?: boolean
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          unit_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_unit_scope_fkey"
            columns: ["unit_scope"]
            isOneToOne: false
            referencedRelation: "training_units"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      provinces: {
        Row: {
          name: string
          province_id: string
        }
        Insert: {
          name: string
          province_id: string
        }
        Update: {
          name?: string
          province_id?: string
        }
        Relationships: []
      }
      storage_orphan_reports: {
        Row: {
          checked_at: string
          orphan_count: number
          orphan_keys: string[]
          report_id: string
        }
        Insert: {
          checked_at?: string
          orphan_count?: number
          orphan_keys?: string[]
          report_id?: string
        }
        Update: {
          checked_at?: string
          orphan_count?: number
          orphan_keys?: string[]
          report_id?: string
        }
        Relationships: []
      }
      subdistricts: {
        Row: {
          district_id: string
          name: string
          postal_code: string | null
          subdistrict_id: string
        }
        Insert: {
          district_id: string
          name: string
          postal_code?: string | null
          subdistrict_id: string
        }
        Update: {
          district_id?: string
          name?: string
          postal_code?: string | null
          subdistrict_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subdistricts_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["district_id"]
          },
        ]
      }
      testing_center_statuses: {
        Row: {
          evidence_ref: string | null
          standard_type: Database["public"]["Enums"]["assessment_standard"]
          status: Database["public"]["Enums"]["testing_center_status_enum"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          evidence_ref?: string | null
          standard_type: Database["public"]["Enums"]["assessment_standard"]
          status: Database["public"]["Enums"]["testing_center_status_enum"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          evidence_ref?: string | null
          standard_type?: Database["public"]["Enums"]["assessment_standard"]
          status?: Database["public"]["Enums"]["testing_center_status_enum"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testing_center_statuses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "training_units"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      training_unit_images: {
        Row: {
          caption: string | null
          created_at: string
          description: string | null
          display_order: number
          file_size: number | null
          height: number | null
          image_id: string
          mime_type: string | null
          original_filename: string | null
          status: Database["public"]["Enums"]["image_status"]
          storage_key: string
          unit_id: string
          uploaded_by: string | null
          visibility: Database["public"]["Enums"]["image_visibility"]
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          file_size?: number | null
          height?: number | null
          image_id?: string
          mime_type?: string | null
          original_filename?: string | null
          status?: Database["public"]["Enums"]["image_status"]
          storage_key: string
          unit_id: string
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["image_visibility"]
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          file_size?: number | null
          height?: number | null
          image_id?: string
          mime_type?: string | null
          original_filename?: string | null
          status?: Database["public"]["Enums"]["image_status"]
          storage_key?: string
          unit_id?: string
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["image_visibility"]
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_unit_images_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "training_units"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "training_unit_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_unit_profiles: {
        Row: {
          address: string | null
          coordinator_first_name: string | null
          coordinator_last_name: string | null
          coordinator_name: string | null
          description: string | null
          district_id: string | null
          district_name: string | null
          email: string | null
          house_no: string | null
          is_food_testing_center: boolean | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          province_id: string | null
          province_name: string | null
          road: string | null
          subdistrict_id: string | null
          subdistrict_name: string | null
          unit_id: string
        }
        Insert: {
          address?: string | null
          coordinator_first_name?: string | null
          coordinator_last_name?: string | null
          coordinator_name?: string | null
          description?: string | null
          district_id?: string | null
          district_name?: string | null
          email?: string | null
          house_no?: string | null
          is_food_testing_center?: boolean | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          province_id?: string | null
          province_name?: string | null
          road?: string | null
          subdistrict_id?: string | null
          subdistrict_name?: string | null
          unit_id: string
        }
        Update: {
          address?: string | null
          coordinator_first_name?: string | null
          coordinator_last_name?: string | null
          coordinator_name?: string | null
          description?: string | null
          district_id?: string | null
          district_name?: string | null
          email?: string | null
          house_no?: string | null
          is_food_testing_center?: boolean | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          province_id?: string | null
          province_name?: string | null
          road?: string | null
          subdistrict_id?: string | null
          subdistrict_name?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_unit_profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["district_id"]
          },
          {
            foreignKeyName: "training_unit_profiles_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["province_id"]
          },
          {
            foreignKeyName: "training_unit_profiles_subdistrict_id_fkey"
            columns: ["subdistrict_id"]
            isOneToOne: false
            referencedRelation: "subdistricts"
            referencedColumns: ["subdistrict_id"]
          },
          {
            foreignKeyName: "training_unit_profiles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "training_units"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      training_units: {
        Row: {
          created_at: string
          created_by: string
          external_ref: string | null
          name: string
          region: Database["public"]["Enums"]["region_type"]
          status: Database["public"]["Enums"]["unit_status"]
          type: Database["public"]["Enums"]["unit_type"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          external_ref?: string | null
          name: string
          region: Database["public"]["Enums"]["region_type"]
          status?: Database["public"]["Enums"]["unit_status"]
          type: Database["public"]["Enums"]["unit_type"]
          unit_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          external_ref?: string | null
          name?: string
          region?: Database["public"]["Enums"]["region_type"]
          status?: Database["public"]["Enums"]["unit_status"]
          type?: Database["public"]["Enums"]["unit_type"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_units_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_participation: {
        Row: {
          created_at: string
          fiscal_year: number
          note: string | null
          participation_id: string
          responded_at: string | null
          responded_by: string | null
          round_id: string
          status: Database["public"]["Enums"]["participation_status"]
          unit_id: string
        }
        Insert: {
          created_at?: string
          fiscal_year: number
          note?: string | null
          participation_id?: string
          responded_at?: string | null
          responded_by?: string | null
          round_id: string
          status?: Database["public"]["Enums"]["participation_status"]
          unit_id: string
        }
        Update: {
          created_at?: string
          fiscal_year?: number
          note?: string | null
          participation_id?: string
          responded_at?: string | null
          responded_by?: string | null
          round_id?: string
          status?: Database["public"]["Enums"]["participation_status"]
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_participation_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_participation_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "participation_rounds"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "unit_participation_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "training_units"
            referencedColumns: ["unit_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_learner_eligibility: {
        Args: { p_course_id: string; p_national_id_hash: string }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      current_user_unit_scope: { Args: never; Returns: string }
      get_dashboard_fiscal_years: { Args: never; Returns: number[] }
      get_dashboard_kpis: {
        Args: { p_unit_id?: string }
        Returns: {
          anamai_passed: number
          anamai_tested: number
          applicants: number
          attended: number
          completed: number
          dsd_centers: number
          dsd_passed: number
          dsd_tested: number
          pq_centers: number
          total_units: number
          units_with_data: number
        }[]
      }
      get_dashboard_overview: {
        Args: { p_fiscal_year?: number; p_unit_id?: string }
        Returns: Json
      }
      get_participation_summary: {
        Args: { p_fiscal_year: number }
        Returns: {
          confirmed: number
          declined: number
          invited: number
          total: number
        }[]
      }
      open_participation_round: {
        Args: { p_deadline?: string; p_fiscal_year: number; p_notice?: string }
        Returns: string
      }
      respond_participation: {
        Args: {
          p_note?: string
          p_round_id: string
          p_status: Database["public"]["Enums"]["participation_status"]
        }
        Returns: undefined
      }
      set_participation_round_status: {
        Args: {
          p_round_id: string
          p_status: Database["public"]["Enums"]["round_status"]
        }
        Returns: undefined
      }
      submit_training_unit: {
        Args: {
          p_external_ref?: string
          p_latitude?: number
          p_longitude?: number
          p_name: string
          p_region: Database["public"]["Enums"]["region_type"]
          p_type: Database["public"]["Enums"]["unit_type"]
        }
        Returns: string
      }
      sync_participation_round: {
        Args: { p_round_id: string }
        Returns: number
      }
    }
    Enums: {
      assessment_result_enum: "passed" | "failed" | "pending"
      assessment_standard:
        | "dsd_l1"
        | "anamai_food_handler"
        | "anamai_food_contact"
        | "professional_qualification"
        | "other"
      enrollment_status: "applied" | "attending" | "completed" | "failed"
      image_status: "active" | "deleted"
      image_visibility: "public" | "internal"
      import_job_status: "pending" | "processing" | "completed" | "failed"
      learner_source: "unit_self_entry" | "unit_import_file"
      participation_status: "invited" | "confirmed" | "declined"
      region_type:
        | "north"
        | "east"
        | "northeast"
        | "central"
        | "south"
        | "bangkok"
      round_status: "open" | "closed"
      testing_center_status_enum:
        | "not_registered"
        | "in_progress"
        | "registered"
      unit_status: "active" | "inactive"
      unit_type: "university" | "vocational" | "other"
      user_role:
        | "web_master"
        | "central_staff"
        | "unit_coordinator"
        | "executive"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assessment_result_enum: ["passed", "failed", "pending"],
      assessment_standard: [
        "dsd_l1",
        "anamai_food_handler",
        "anamai_food_contact",
        "professional_qualification",
        "other",
      ],
      enrollment_status: ["applied", "attending", "completed", "failed"],
      image_status: ["active", "deleted"],
      image_visibility: ["public", "internal"],
      import_job_status: ["pending", "processing", "completed", "failed"],
      learner_source: ["unit_self_entry", "unit_import_file"],
      participation_status: ["invited", "confirmed", "declined"],
      region_type: [
        "north",
        "east",
        "northeast",
        "central",
        "south",
        "bangkok",
      ],
      round_status: ["open", "closed"],
      testing_center_status_enum: [
        "not_registered",
        "in_progress",
        "registered",
      ],
      unit_status: ["active", "inactive"],
      unit_type: ["university", "vocational", "other"],
      user_role: [
        "web_master",
        "central_staff",
        "unit_coordinator",
        "executive",
      ],
    },
  },
} as const
