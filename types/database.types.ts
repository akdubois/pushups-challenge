export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          timezone: string
          deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          timezone?: string
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          timezone?: string
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          invite_code: string
          start_date: string
          daily_penalty_amount: number
          timezone: string
          deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code: string
          start_date: string
          daily_penalty_amount?: number
          timezone?: string
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          start_date?: string
          daily_penalty_amount?: number
          timezone?: string
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      group_memberships: {
        Row: {
          id: string
          group_id: string
          user_id: string
          is_admin: boolean
          joined_at: string
          deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          is_admin?: boolean
          joined_at?: string
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          is_admin?: boolean
          joined_at?: string
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      daily_logs: {
        Row: {
          id: string
          group_id: string
          user_id: string
          day_number: number
          log_date: string
          completed: boolean
          completed_at: string | null
          note: string | null
          deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          day_number: number
          log_date: string
          completed?: boolean
          completed_at?: string | null
          note?: string | null
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          day_number?: number
          log_date?: string
          completed?: boolean
          completed_at?: string | null
          note?: string | null
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      missed_days: {
        Row: {
          id: string
          group_id: string
          user_id: string
          day_number: number
          missed_date: string
          penalty_amount: number
          paid: boolean
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          day_number: number
          missed_date: string
          penalty_amount: number
          paid?: boolean
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          day_number?: number
          missed_date?: string
          penalty_amount?: number
          paid?: boolean
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cheers: {
        Row: {
          id: string
          daily_log_id: string
          user_id: string
          emoji: string
          deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          daily_log_id: string
          user_id: string
          emoji: string
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          daily_log_id?: string
          user_id?: string
          emoji?: string
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          daily_log_id: string
          user_id: string
          content: string
          deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          daily_log_id: string
          user_id: string
          content: string
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          daily_log_id?: string
          user_id?: string
          content?: string
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
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
  }
}
