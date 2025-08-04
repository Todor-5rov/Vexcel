import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client for API routes
export const createServerSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

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
          title?: string
          message_count: number
          last_message_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_id: string
          title?: string
          message_count?: number
          last_message_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_id?: string
          title?: string
          message_count?: number
          last_message_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
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
