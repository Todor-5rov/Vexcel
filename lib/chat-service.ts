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
  // Get or create chat session for a file with improved error handling
  static async getOrCreateSession(userId: string, fileId: string): Promise<string> {
    try {
      console.log("Getting or creating chat session for:", { userId, fileId })

      // First, try to find existing session with LIMIT 1 to prevent multiple rows error
      const { data: existingSessions, error: findError } = await supabase
        .from("chat_sessions")
        .select("id, created_at")
        .eq("user_id", userId)
        .eq("file_id", fileId)
        .order("created_at", { ascending: false })
        .limit(1) // Explicitly limit to 1 result

      console.log("Existing session query result:", {
        existingSessions,
        findError,
        count: existingSessions?.length || 0,
      })

      if (findError) {
        console.warn("Error finding existing session:", findError)
        // Continue to create new session if query failed
      }

      // If we found an existing session, return it
      if (existingSessions && existingSessions.length > 0 && !findError) {
        console.log("Found existing chat session:", existingSessions[0].id)
        return existingSessions[0].id
      }

      // Create new session with conflict handling
      console.log("Creating new chat session...")
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
        console.error("Error creating chat session:", createError)

        // If it's a unique constraint violation, try to find the existing session again
        if (createError.code === "23505") {
          // Unique constraint violation
          console.log("Unique constraint violation, trying to find existing session again...")

          const { data: retrySession, error: retryError } = await supabase
            .from("chat_sessions")
            .select("id")
            .eq("user_id", userId)
            .eq("file_id", fileId)
            .limit(1)
            .single()

          if (!retryError && retrySession) {
            console.log("Found existing session after constraint violation:", retrySession.id)
            return retrySession.id
          }
        }

        throw createError
      }

      console.log("Created new chat session:", newSession.id)
      return newSession.id
    } catch (error) {
      console.error("Error in getOrCreateSession:", error)
      // Return a temporary session ID as fallback
      return `temp-${userId}-${fileId}-${Date.now()}`
    }
  }

  // Load chat messages for a session with better error handling
  static async loadMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      // Handle temporary session IDs
      if (sessionId.startsWith("temp-")) {
        console.log("Temporary session ID detected, returning empty messages")
        return []
      }

      console.log("Loading messages for session:", sessionId)

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(100) // Limit to prevent excessive loading

      if (error) {
        console.warn("Error loading chat messages:", error)
        return []
      }

      console.log(`Loaded ${data?.length || 0} messages for session ${sessionId}`)

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

  // Save a new message with better error handling and deduplication
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
      // Don't save messages for temporary sessions
      if (sessionId.startsWith("temp-")) {
        console.log("Temporary session, not saving message to database")
        return `temp-msg-${Date.now()}`
      }

      console.log("Saving message to session:", sessionId)

      // Check if this exact message already exists (prevent duplicates)
      const { data: existingMessage, error: checkError } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("session_id", sessionId)
        .eq("role", role)
        .eq("content", content)
        .gte("created_at", new Date(Date.now() - 5000).toISOString()) // Within last 5 seconds
        .limit(1)
        .maybeSingle()

      if (!checkError && existingMessage) {
        console.log("Duplicate message detected, returning existing ID:", existingMessage.id)
        return existingMessage.id
      }

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
        console.warn("Error saving chat message:", error)
        return `temp-msg-${Date.now()}`
      }

      console.log("Saved chat message:", data.id)
      return data.id
    } catch (error) {
      console.error("Error saving chat message:", error)
      return `temp-msg-${Date.now()}`
    }
  }

  // Get chat sessions for a user with better error handling
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
        .limit(50) // Limit to prevent excessive loading

      if (error) {
        console.warn("Error getting user sessions:", error)
        return []
      }

      console.log(`Found ${data?.length || 0} sessions for user ${userId}`)

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
      // Don't try to delete temporary sessions
      if (sessionId.startsWith("temp-")) {
        console.log("Temporary session, nothing to delete")
        return
      }

      console.log("Deleting session:", sessionId)

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

  // Create a welcome message for new chats
  static createWelcomeMessage(filename?: string, dataLength?: number, headers?: string[]): ChatMessage {
    let content = "Hello! I'm your VExcel AI assistant powered by ElevenLabs voice recognition. "

    if (filename && dataLength && headers && headers.length > 0) {
      content += `I can see your spreadsheet "${filename}" with ${dataLength - 1} rows and columns: ${headers.join(", ")}. 

I can help you manipulate this data using natural language or voice commands. Try asking me to:
• "Sort by ${headers[0] || "first column"}"
• "Calculate averages" 
• "Add a new column"
• "Create a pivot table"
• "Generate charts"

All changes will be automatically synced to OneDrive for real-time collaboration! 🎤 Click the microphone to use voice commands with ElevenLabs.`
    } else {
      content += `Upload an Excel file first, and I'll help you manipulate your data using natural language commands or voice input with ElevenLabs speech recognition.

Features available:
• 🎤 Voice commands with ElevenLabs
• 📊 Advanced Excel operations  
• ☁️ Real-time OneDrive sync
• 🤖 AI-powered data analysis`
    }

    return {
      id: "welcome",
      role: "assistant",
      content,
      messageType: "normal",
      voiceInput: false,
      timestamp: new Date(),
    }
  }

  // Clean up duplicate sessions for a user (utility function)
  static async cleanupDuplicateSessions(userId: string): Promise<void> {
    try {
      console.log("Cleaning up duplicate sessions for user:", userId)

      // This will be handled by the database constraint now, but keeping as utility
      const { error } = await supabase.rpc("cleanup_duplicate_sessions", {
        target_user_id: userId,
      })

      if (error) {
        console.warn("Error cleaning up duplicate sessions:", error)
      } else {
        console.log("Successfully cleaned up duplicate sessions")
      }
    } catch (error) {
      console.error("Error in cleanup:", error)
    }
  }
}
