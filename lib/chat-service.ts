import { supabase } from "./supabase"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  messageType: "normal" | "suggestion" | "error"
  voiceInput: boolean
  timestamp: Date
}

export interface ChatSession {
  id: string
  fileId: string
  title?: string
  messageCount: number
  lastMessageAt: Date
  createdAt: Date
}

export class ChatService {
  // Get or create chat session for a file
  static async getOrCreateSession(userId: string, fileId: string): Promise<string> {
    try {
      // First, try to find existing session
      const { data: existingSession, error: findError } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("file_id", fileId)
        .single()

      if (existingSession && !findError) {
        console.log("Found existing chat session:", existingSession.id)
        return existingSession.id
      }

      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: userId,
          file_id: fileId,
          message_count: 0,
        })
        .select("id")
        .single()

      if (createError) {
        throw createError
      }

      console.log("Created new chat session:", newSession.id)
      return newSession.id
    } catch (error) {
      console.error("Error getting/creating chat session:", error)
      throw error
    }
  }

  // Load chat messages for a session
  static async loadMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })

      if (error) {
        throw error
      }

      return (data || []).map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        messageType: msg.message_type as "normal" | "suggestion" | "error",
        voiceInput: msg.voice_input,
        timestamp: new Date(msg.created_at),
      }))
    } catch (error) {
      console.error("Error loading chat messages:", error)
      return []
    }
  }

  // Save a new message
  static async saveMessage(
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    options: {
      messageType?: "normal" | "suggestion" | "error"
      voiceInput?: boolean
    } = {},
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          session_id: sessionId,
          role,
          content,
          message_type: options.messageType || "normal",
          voice_input: options.voiceInput || false,
        })
        .select("id")
        .single()

      if (error) {
        throw error
      }

      console.log("Saved chat message:", data.id)
      return data.id
    } catch (error) {
      console.error("Error saving chat message:", error)
      throw error
    }
  }

  // Get chat sessions for a user
  static async getUserSessions(userId: string): Promise<ChatSession[]> {
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select(`
          id,
          file_id,
          title,
          message_count,
          last_message_at,
          created_at,
          user_files!inner(file_name)
        `)
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false })

      if (error) {
        throw error
      }

      return (data || []).map((session) => ({
        id: session.id,
        fileId: session.file_id,
        title: session.title || `Chat with ${(session.user_files as any)?.file_name || "Unknown File"}`,
        messageCount: session.message_count,
        lastMessageAt: new Date(session.last_message_at),
        createdAt: new Date(session.created_at),
      }))
    } catch (error) {
      console.error("Error getting user sessions:", error)
      return []
    }
  }

  // Delete a chat session and all its messages
  static async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      // Verify ownership
      const { data: session, error: verifyError } = await supabase
        .from("chat_sessions")
        .select("user_id")
        .eq("id", sessionId)
        .single()

      if (verifyError || session?.user_id !== userId) {
        throw new Error("Session not found or access denied")
      }

      // Delete session (messages will be deleted automatically due to CASCADE)
      const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId)

      if (error) {
        throw error
      }

      console.log("Deleted chat session:", sessionId)
    } catch (error) {
      console.error("Error deleting chat session:", error)
      throw error
    }
  }
}
