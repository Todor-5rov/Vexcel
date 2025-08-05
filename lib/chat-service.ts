import { supabase } from "./supabase"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  messageType: "normal" | "suggestion" | "error"
  voiceInput: boolean
  timestamp: Date
}

export class ChatService {
  // Load all chat messages for a specific file
  static async loadMessagesForFile(userId: string, fileId: string): Promise<ChatMessage[]> {
    try {
      console.log("Loading messages for file:", { userId, fileId })

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", userId)
        .eq("file_id", fileId)
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

      console.log(`Loaded ${messages.length} messages for file ${fileId}`)
      return messages
    } catch (error) {
      console.error("Error loading chat messages:", error)
      return []
    }
  }

  // Save a new message directly to a file
  static async saveMessageForFile(
    userId: string,
    fileId: string,
    role: "user" | "assistant",
    content: string,
    options: {
      messageType?: "normal" | "suggestion" | "error"
      voiceInput?: boolean
    } = {},
  ): Promise<string> {
    try {
      console.log("Saving message for file:", { userId, fileId, role, contentLength: content.length, options })

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          user_id: userId,
          file_id: fileId,
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

      console.log("Saved chat message:", data.id)
      return data.id
    } catch (error) {
      console.error("Error saving chat message:", error)
      throw error
    }
  }

  // Delete all messages for a specific file
  static async deleteMessagesForFile(userId: string, fileId: string): Promise<void> {
    try {
      console.log("Deleting messages for file:", { userId, fileId })

      const { error } = await supabase.from("chat_messages").delete().eq("user_id", userId).eq("file_id", fileId)

      if (error) {
        console.error("Error deleting messages:", error)
        throw error
      }

      console.log("Successfully deleted messages for file:", fileId)
    } catch (error) {
      console.error("Error deleting chat messages:", error)
      throw error
    }
  }

  // Get message count for a file
  static async getMessageCountForFile(userId: string, fileId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("file_id", fileId)

      if (error) {
        console.error("Error getting message count:", error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error("Error getting message count:", error)
      return 0
    }
  }
}
