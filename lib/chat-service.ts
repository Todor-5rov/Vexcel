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
  fileName?: string
}

export class ChatService {
  // Get or create chat session for a file
  static async getOrCreateSession(userId: string, fileId: string): Promise<string> {
    try {
      console.log("Getting/creating chat session for:", { userId, fileId })

      // First, try to find existing session
      const { data: existingSession, error: findError } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("file_id", fileId)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle()

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
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (createError) {
        console.error("Error creating chat session:", createError)
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
      console.log("Loading messages for session:", sessionId)

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error loading messages:", error)
        throw error
      }

      const messages = (data || []).map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        messageType: msg.message_type as "normal" | "suggestion" | "error",
        voiceInput: msg.voice_input || false,
        timestamp: new Date(msg.created_at),
      }))

      console.log(`Loaded ${messages.length} messages for session ${sessionId}`)
      return messages
    } catch (error) {
      console.error("Error loading chat messages:", error)
      return []
    }
  }

  // Save a new message
  static async saveMessage(
    sessionId: string,
    userId: string,
    role: "user" | "assistant",
    content: string,
    options: {
      messageType?: "normal" | "suggestion" | "error"
      voiceInput?: boolean
    } = {},
  ): Promise<string> {
    try {
      console.log("Saving message:", { sessionId, userId, role, contentLength: content.length, options })

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          user_id: userId,
          session_id: sessionId,
          role,
          content,
          message_type: options.messageType || "normal",
          voice_input: options.voiceInput || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (error) {
        console.error("Error saving message:", error)
        throw error
      }

      // Update session stats
      await this.updateSessionStats(sessionId, userId, content, role)

      console.log("Saved chat message:", data.id)
      return data.id
    } catch (error) {
      console.error("Error saving chat message:", error)
      throw error
    }
  }

  // Update session statistics
  private static async updateSessionStats(
    sessionId: string,
    userId: string,
    content: string,
    role: "user" | "assistant"
  ): Promise<void> {
    try {
      // Get current message count
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId)

      // Update session with new stats
      const updateData: any = {
        message_count: count || 0,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Set title from first user message if not already set
      if (role === "user") {
        const { data: session } = await supabase
          .from("chat_sessions")
          .select("title")
          .eq("id", sessionId)
          .single()

        if (!session?.title) {
          updateData.title = content.length > 50 ? content.substring(0, 50) + "..." : content
        }
      }

      await supabase
        .from("chat_sessions")
        .update(updateData)
        .eq("id", sessionId)
        .eq("user_id", userId)

    } catch (error) {
      console.error("Error updating session stats:", error)
    }
  }

  // Get chat sessions for a user with file information
  static async getUserSessions(userId: string): Promise<ChatSession[]> {
    try {
      console.log("Getting user sessions for:", userId)

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
        console.error("Error getting user sessions:", error)
        throw error
      }

      const sessions = (data || []).map((session: any) => ({
        id: session.id,
        fileId: session.file_id,
        title: session.title || `Chat with ${session.user_files?.file_name || "Unknown File"}`,
        messageCount: session.message_count || 0,
        lastMessageAt: new Date(session.last_message_at),
        createdAt: new Date(session.created_at),
        fileName: session.user_files?.file_name,
      }))

      console.log(`Found ${sessions.length} sessions for user ${userId}`)
      return sessions
    } catch (error) {
      console.error("Error getting user sessions:", error)
      return []
    }
  }

  // Delete a chat session and all its messages
  static async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      console.log("Deleting session:", { sessionId, userId })

      // First delete all messages in the session
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", userId)

      if (messagesError) {
        console.error("Error deleting messages:", messagesError)
        throw messagesError
      }

      // Then delete the session
      const { error: sessionError } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", userId)

      if (sessionError) {
        console.error("Error deleting session:", sessionError)
        throw sessionError
      }

      console.log("Successfully deleted chat session:", sessionId)
    } catch (error) {
      console.error("Error deleting chat session:", error)
      throw error
    }
  }

  // Get session by file ID (for switching files)
  static async getSessionByFileId(userId: string, fileId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("file_id", fileId)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error("Error getting session by file ID:", error)
        return null
      }

      return data?.id || null
    } catch (error) {
      console.error("Error getting session by file ID:", error)
      return null
    }
  }

  // Update session title manually
  static async updateSessionTitle(sessionId: string, userId: string, title: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("chat_sessions")
        .update({ 
          title, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", sessionId)
        .eq("user_id", userId)

      if (error) {
        throw error
      }

      console.log("Updated session title:", { sessionId, title })
    } catch (error) {
      console.error("Error updating session title:", error)
      throw error
    }
  }
}
