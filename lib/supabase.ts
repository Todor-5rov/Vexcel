import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://ngmvgrdaqgxgxwvsylcf.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbXZncmRhcWd4Z3h3dnN5bGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjg4ODMsImV4cCI6MjA2ODcwNDg4M30.kQS7yIGPYXD1t2DedCIYd-O7NOtvOeU-6zsr9m-M1Mo"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      user_files: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number
          uploaded_at: string
          last_accessed: string
          mcp_filename?: string
          mcp_file_path?: string
          onedrive_file_id?: string
          onedrive_web_url?: string
          onedrive_embed_url?: string
          onedrive_uploaded_at?: string
          onedrive_folder_path?: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number
          uploaded_at?: string
          last_accessed?: string
          mcp_filename?: string
          mcp_file_path?: string
          onedrive_file_id?: string
          onedrive_web_url?: string
          onedrive_embed_url?: string
          onedrive_uploaded_at?: string
          onedrive_folder_path?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          uploaded_at?: string
          last_accessed?: string
          mcp_filename?: string
          mcp_file_path?: string
          onedrive_file_id?: string
          onedrive_web_url?: string
          onedrive_embed_url?: string
          onedrive_uploaded_at?: string
          onedrive_folder_path?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          file_id: string
          created_at: string
          updated_at: string
          title?: string
          last_message_at: string
          message_count: number
        }
        Insert: {
          id?: string
          user_id: string
          file_id: string
          created_at?: string
          updated_at?: string
          title?: string
          last_message_at?: string
          message_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          file_id?: string
          created_at?: string
          updated_at?: string
          title?: string
          last_message_at?: string
          message_count?: number
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          session_id: string
          role: "user" | "assistant"
          content: string
          message_type: "normal" | "suggestion" | "error"
          voice_input: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          role: "user" | "assistant"
          content: string
          message_type?: "normal" | "suggestion" | "error"
          voice_input?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          role?: "user" | "assistant"
          content?: string
          message_type?: "normal" | "suggestion" | "error"
          voice_input?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
