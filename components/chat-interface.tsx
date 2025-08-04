'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Loader2, FileSpreadsheet } from 'lucide-react'
import { VoiceInputButton } from './voice-input-button'
import { ChatService } from '@/lib/chat-service'
import { AIService } from '@/lib/ai-service'
import { useToast } from '@/hooks/use-toast'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

interface ChatSession {
  id: string
  file_name: string
  created_at: string
  message_count: number
}

interface ChatInterfaceProps {
  currentData: any[]
  headers: string[]
  fileName: string
  userId: string
}

export function ChatInterface({ currentData, headers, fileName, userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatSession, setChatSession] = useState<ChatSession | null>(null)
  const [chatInitialized, setChatInitialized] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const chatService = new ChatService()
  const aiService = new AIService()

  // Memoize values to prevent re-renders
  const dataLength = useMemo(() => currentData.length, [currentData])
  const headersString = useMemo(() => headers.join(','), [headers])

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [])

  const loadChatSession = useCallback(async () => {
    if (!userId || !fileName || chatInitialized) return

    try {
      setIsLoading(true)
      const session = await chatService.getOrCreateSession(userId, fileName)
      setChatSession(session)
      
      const chatMessages = await chatService.getMessages(session.id)
      setMessages(chatMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        timestamp: new Date(msg.created_at)
      })))
      
      setChatInitialized(true)
    } catch (error) {
      console.error('Error loading chat session:', error)
      toast({
        title: "Error",
        description: "Failed to load chat session",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [userId, fileName, chatInitialized, chatService, toast])

  // Reset initialization when file changes
  useEffect(() => {
    setChatInitialized(false)
    setMessages([])
    setChatSession(null)
  }, [fileName])

  // Load chat session
  useEffect(() => {
    loadChatSession()
  }, [loadChatSession])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !chatSession) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Save user message
      await chatService.saveMessage(chatSession.id, userMessage.content, 'user')

      // Get AI response
      const response = await aiService.processQuery(
        userMessage.content,
        currentData,
        headers,
        fileName
      )

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Save assistant message
      await chatService.saveMessage(chatSession.id, assistantMessage.content, 'assistant')

    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleVoiceTranscript = (transcript: string) => {
    setInput(transcript)
  }

  if (!userId) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please sign in to use the chat feature.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Assistant
          {fileName && (
            <Badge variant="secondary" className="ml-auto">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              {fileName}
            </Badge>
          )}
        </CardTitle>
        {dataLength > 0 && (
          <p className="text-sm text-muted-foreground">
            Analyzing {dataLength} rows with {headers.length} columns
          </p>
        )}
      </CardHeader>
      
      <Separator />
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Ready to help!</p>
                <p className="text-sm">
                  Ask me anything about your Excel data. I can help with analysis, 
                  calculations, insights, and more.
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                
                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <Separator />
        
        <div className="p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your data..."
              disabled={isLoading}
              className="flex-1"
            />
            <VoiceInputButton
              onTranscript={handleVoiceTranscript}
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
