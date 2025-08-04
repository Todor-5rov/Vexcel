import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  messageType?: 'normal' | 'error'
  voiceInput?: boolean
  timestamp: Date
}

export interface ChatSession {
  id: string
  user_id: string
  file_id: string
  file_name: string
  created_at: string
  updated_at: string
  message_count: number
}

export class ChatService {
  static async getOrCreateSession(userId: string, fileId: string): Promise<string> {
    try {
      // First try to get existing session
      const { data: existingSession, error: fetchError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('file_id', fileId)
        .limit(1)
        .single()

      if (existingSession && !fetchError) {
        return existingSession.id
      }

      // Create new session if none exists
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          file_id: fileId,
          file_name: fileId, // Use fileId as filename for now
          message_count: 0
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating chat session:', createError)
        return `temp-${Date.now()}`
      }

      return newSession.id
    } catch (error) {
      console.error('Error in getOrCreateSession:', error)
      return `temp-${Date.now()}`
    }
  }

  static async loadMessages(sessionId: string): Promise<ChatMessage[]> {
    if (sessionId.startsWith('temp-')) {
      return []
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return []
      }

      return data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        messageType: msg.message_type || 'normal',
        voiceInput: msg.voice_input || false,
        timestamp: new Date(msg.created_at)
      }))
    } catch (error) {
      console.error('Error loading messages:', error)
      return []
    }
  }

  static async saveMessage(
    sessionId: string, 
    role: 'user' | 'assistant', 
    content: string,
    metadata?: { messageType?: string; voiceInput?: boolean }
  ): Promise<void> {
    if (sessionId.startsWith('temp-')) {
      return
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role,
          content,
          message_type: metadata?.messageType || 'normal',
          voice_input: metadata?.voiceInput || false
        })

      if (error) {
        console.error('Error saving message:', error)
      }
    } catch (error) {
      console.error('Error saving message:', error)
    }
  }

  static createWelcomeMessage(filename?: string, dataLength?: number, headers?: string[]): ChatMessage {
    let content = "👋 Hello! I'm your AI Excel assistant."
    
    if (filename && dataLength && headers) {
      content += `\n\nI can see you've loaded "${filename}" with ${dataLength} rows and ${headers.length} columns (${headers.slice(0, 3).join(', ')}${headers.length > 3 ? '...' : ''}).`
      content += "\n\nI can help you with:\n• Data analysis and insights\n• Calculations and formulas\n• Sorting and filtering\n• Creating charts and summaries\n• And much more!"
    } else {
      content += "\n\nPlease upload an Excel file to get started. I can help you analyze data, create formulas, generate insights, and perform various Excel operations through natural language commands."
    }
    
    content += "\n\nWhat would you like to do with your data?"

    return {
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content,
      messageType: 'normal',
      voiceInput: false,
      timestamp: new Date()
    }
  }
}
