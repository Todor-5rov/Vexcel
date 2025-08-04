"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Send,
  Bot,
  User,
  Zap,
  MessageSquare,
  AlertTriangle,
  Cloud,
  FolderSyncIcon as Sync,
  Volume2,
} from "lucide-react"
import VoiceInputButton from "@/components/voice-input-button"
import { ChatService, type ChatMessage } from "@/lib/chat-service"

interface ChatInterfaceProps {
  fileId?: string
  mcpFilePath?: string
  currentData?: string[][]
  headers?: string[]
  onDataUpdate?: (newData: string[][]) => void
  onRefreshData?: () => void
  userId?: string
}

export default function ChatInterface({
  fileId,
  mcpFilePath,
  currentData = [],
  headers = [],
  onDataUpdate,
  onRefreshData,
  userId,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Function to clean markdown from AI responses
  const cleanMarkdown = (text: string): string => {
    let cleaned = text.replace(/```[\w]*\n?/g, "").replace(/```/g, "")
    cleaned = cleaned
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/^\s*[-*+]\s/gm, "• ")
      .replace(/^\s*\d+\.\s/gm, "")
      .trim()
    return cleaned
  }

  // Check if OpenAI API key is configured
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        console.log("Checking API key...")
        const response = await fetch("/api/check-api-key")
        const data = await response.json()
        console.log("API key check result:", data)
        setHasApiKey(data.hasApiKey)
      } catch (error) {
        console.error("Error checking API key:", error)
        setHasApiKey(false)
      }
    }

    checkApiKey()
  }, [])

  // Load chat session when file changes
  useEffect(() => {
    const loadChatSession = async () => {
      if (!fileId || !userId) {
        // Show default welcome message
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              currentData.length > 0
                ? `Hello! I can see your spreadsheet with ${currentData.length - 1} rows and columns: ${headers.join(", ")}. I can help you manipulate this data using natural language. Try asking me to "sort by salary", "calculate averages", or "add a new column". All changes will be automatically synced to OneDrive!`
                : "Hello! I'm your VExcel AI assistant. Upload a file first, and I'll help you manipulate your Excel data using natural language commands with advanced Excel operations and real-time OneDrive sync.",
            messageType: "normal",
            voiceInput: false,
            timestamp: new Date(),
          },
        ])
        return
      }

      try {
        setIsLoadingChat(true)

        // Get or create chat session
        const newSessionId = await ChatService.getOrCreateSession(userId, fileId)
        setSessionId(newSessionId)

        // Load existing messages
        const existingMessages = await ChatService.loadMessages(newSessionId)

        if (existingMessages.length === 0) {
          // No existing messages, show welcome message
          const filename = mcpFilePath?.split("/").pop() || "your file"
          const welcomeMessage: ChatMessage = {
            id: "welcome",
            role: "assistant",
            content: `Hello! I can see your spreadsheet "${filename}" with ${currentData.length - 1} rows and columns: ${headers.join(", ")}. I can help you manipulate this data using natural language. Try asking me to "sort by ${headers[0]}", "calculate averages", or "add a new column". All changes will be automatically synced to OneDrive for real-time collaboration!`,
            messageType: "normal",
            voiceInput: false,
            timestamp: new Date(),
          }

          // Save welcome message
          await ChatService.saveMessage(newSessionId, "assistant", welcomeMessage.content)
          setMessages([welcomeMessage])
        } else {
          setMessages(existingMessages)
        }
      } catch (error) {
        console.error("Error loading chat session:", error)
        // Fallback to default message
        setMessages([
          {
            id: "error",
            role: "assistant",
            content: "Welcome back! I'm ready to help you with your Excel data.",
            messageType: "normal",
            voiceInput: false,
            timestamp: new Date(),
          },
        ])
      } finally {
        setIsLoadingChat(false)
      }
    }

    loadChatSession()
  }, [fileId, userId, mcpFilePath, currentData.length, headers])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (message?: string, isVoiceInput = false) => {
    const messageText = message || input.trim()
    if (!messageText || isLoading) return

    console.log("=== HANDLE SEND DEBUG ===")
    console.log("Sending message:", messageText)
    console.log("Is voice input:", isVoiceInput)
    console.log("MCP File Path:", mcpFilePath)
    console.log("File ID:", fileId)
    console.log("Session ID:", sessionId)
    console.log("Has API key (state):", hasApiKey)
    console.log("Current data length:", currentData.length)
    console.log("Headers:", headers)

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      messageType: "normal",
      voiceInput: isVoiceInput,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Save user message to database
    if (sessionId) {
      try {
        await ChatService.saveMessage(sessionId, "user", messageText, {
          messageType: "normal",
          voiceInput: isVoiceInput,
        })
      } catch (error) {
        console.error("Error saving user message:", error)
      }
    }

    try {
      if (!hasApiKey) {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "I understand your request, but I need an OpenAI API key to process natural language commands. Please add your OpenAI API key to the environment variables.",
          messageType: "error",
          voiceInput: false,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])

        // Save error message
        if (sessionId) {
          await ChatService.saveMessage(sessionId, "assistant", errorMessage.content, {
            messageType: "error",
          })
        }
        return
      }

      // Call the server-side API route with file ID for sync
      console.log("Calling server-side AI API with sync support...")
      const response = await fetch("/api/ai/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userMessage: messageText,
          currentData,
          headers,
          mcpFilePath: mcpFilePath || "",
          fileId: fileId || null, // Pass file ID for sync operations
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log("Server AI result:", result)

      const cleanedResponse = cleanMarkdown(result.response)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: cleanedResponse,
        messageType: "normal",
        voiceInput: false,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Save assistant message to database
      if (sessionId) {
        try {
          await ChatService.saveMessage(sessionId, "assistant", cleanedResponse, {
            messageType: "normal",
          })
        } catch (error) {
          console.error("Error saving assistant message:", error)
        }
      }

      // If file was modified, refresh the data
      if (result.fileModified && onRefreshData) {
        setTimeout(() => {
          onRefreshData()
        }, 2000) // Give the sync a moment to complete
      }

      // If we have new data, update it
      if (result.newData && onDataUpdate) {
        onDataUpdate(result.newData)
      }
    } catch (error) {
      console.error("AI processing error:", error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I encountered an error processing your request: ${error instanceof Error ? error.message : "Unknown error"}. Please try again or rephrase your command.`,
        messageType: "error",
        voiceInput: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])

      // Save error message
      if (sessionId) {
        try {
          await ChatService.saveMessage(sessionId, "assistant", errorMessage.content, {
            messageType: "error",
          })
        } catch (error) {
          console.error("Error saving error message:", error)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceInput = (text: string) => {
    console.log("Voice input received:", text)
    setInput(text)
    // Automatically send the voice input
    setTimeout(() => {
      handleSend(text, true)
    }, 100)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const suggestions =
    currentData.length > 0
      ? [
          `Sort by ${headers[0] || "first column"} descending`,
          `Calculate average of ${headers.find((h) => h.toLowerCase().includes("salary") || h.toLowerCase().includes("age") || h.toLowerCase().includes("price")) || "numeric column"}`,
          "Add a new column with formula",
          "Create a pivot table",
          "Generate a chart from this data",
        ]
      : ["Upload an Excel file first", "Try advanced Excel operations", "Learn about VExcel features"]

  const canChat = mcpFilePath && hasApiKey
  const filename = mcpFilePath?.split("/").pop() || ""

  console.log("Can chat calculation:", { mcpFilePath: !!mcpFilePath, hasApiKey, canChat })

  return (
    <div className="h-full flex flex-col">
      <Card className="h-full flex flex-col shadow-xl border-0 bg-gradient-to-br from-white to-primary-25 overflow-hidden">
        <CardHeader className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-primary-100">
          <CardTitle className="flex items-center gap-3 text-primary-600">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <Cloud className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div
                className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${canChat ? "bg-green-500" : "bg-yellow-500"} animate-pulse`}
              />
            </div>
            <div>
              <div className="font-bold text-lg">Excel AI Assistant</div>
              <div className="text-sm text-gray-500 font-normal flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${canChat ? "bg-green-500" : "bg-yellow-500"}`} />
                {canChat ? (
                  <span className="flex items-center gap-1">
                    <Sync className="h-3 w-3" />
                    Ready with {filename} (Auto-sync enabled)
                  </span>
                ) : (
                  "Waiting for file or API key..."
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Loading indicator for chat */}
          {isLoadingChat && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <Sync className="h-5 w-5 animate-spin text-primary-500" />
                <span className="text-gray-600">Loading chat history...</span>
              </div>
            </div>
          )}

          {/* Messages - This is the scrollable area */}
          {!isLoadingChat && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {message.role === "assistant" && (
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                        message.messageType === "error"
                          ? "bg-gradient-to-r from-red-500 to-red-600"
                          : "bg-gradient-to-r from-primary-500 to-primary-600"
                      }`}
                    >
                      {message.messageType === "error" ? (
                        <AlertTriangle className="h-5 w-5 text-white" />
                      ) : (
                        <Bot className="h-5 w-5 text-white" />
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl p-5 shadow-lg relative ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white"
                        : message.messageType === "error"
                          ? "bg-red-50 text-red-900 border border-red-200"
                          : "bg-white text-gray-900 border border-primary-100"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div
                        className={`absolute -left-2 top-4 w-4 h-4 border-l border-b transform rotate-45 ${
                          message.messageType === "error" ? "bg-red-50 border-red-200" : "bg-white border-primary-100"
                        }`}
                      />
                    )}
                    {message.role === "user" && (
                      <div className="absolute -right-2 top-4 w-4 h-4 bg-primary-500 transform rotate-45" />
                    )}

                    <div
                      className={`text-base leading-relaxed font-medium ${
                        message.role === "user"
                          ? "text-white"
                          : message.messageType === "error"
                            ? "text-red-900"
                            : "text-gray-800"
                      }`}
                      style={{
                        fontFamily:
                          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        lineHeight: "1.6",
                        fontSize: "15px",
                      }}
                    >
                      {message.content.split("\n").map((line, idx) => (
                        <React.Fragment key={idx}>
                          {line}
                          {idx < message.content.split("\n").length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p
                        className={`text-xs ${
                          message.role === "user"
                            ? "text-primary-100"
                            : message.messageType === "error"
                              ? "text-red-600"
                              : "text-gray-500"
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                      {message.voiceInput && (
                        <div className="flex items-center gap-1">
                          <Volume2 className="h-3 w-3 text-primary-400" />
                          <span className="text-xs text-primary-400">Voice</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4 justify-start animate-fade-in-up">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-lg border border-primary-100 relative">
                    <div className="absolute -left-2 top-4 w-4 h-4 bg-white border-l border-b border-primary-100 transform rotate-45" />
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 font-medium flex items-center gap-1">
                        <Sync className="h-3 w-3 animate-spin" />
                        AI processing with auto-sync to OneDrive...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Service Status Warning */}
          {(!hasApiKey || !mcpFilePath) && !isLoadingChat && (
            <div className="flex-shrink-0 border-t border-yellow-200 p-4 bg-yellow-50/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">Service Status</span>
              </div>
              <div className="text-xs text-yellow-600 space-y-1">
                {!hasApiKey && <p>• OpenAI API key not configured</p>}
                {!mcpFilePath && <p>• No file selected for processing</p>}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {currentData.length > 0 && messages.length <= 2 && canChat && !isLoadingChat && (
            <div className="flex-shrink-0 border-t border-primary-200 p-4 bg-primary-50/50">
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary-600" />
                  <span className="text-sm font-medium text-primary-700">Try these Excel operations:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 3).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSend(suggestion)}
                      disabled={!canChat || isLoading}
                      className="text-xs bg-white text-primary-600 px-3 py-2 rounded-full border border-primary-200 hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input - Fixed at bottom */}
          {!isLoadingChat && (
            <div className="flex-shrink-0 border-t border-primary-200 p-4 bg-white/80 backdrop-blur-sm">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      !mcpFilePath
                        ? "Upload a file first to get started"
                        : !hasApiKey
                          ? "OpenAI API key required..."
                          : "Ask me to modify your Excel data with auto-sync to OneDrive..."
                    }
                    disabled={!canChat || isLoading}
                    className="pr-12 h-12 border-primary-200 focus:border-primary-400 focus:ring-primary-400 bg-white shadow-sm text-base"
                    style={{ fontSize: "15px" }}
                  />
                  {input && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Zap className="h-4 w-4 text-primary-500 animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Voice Input Button */}
                <VoiceInputButton onVoiceInput={handleVoiceInput} disabled={!canChat || isLoading} className="h-12" />

                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || !canChat || isLoading}
                  className="h-12 px-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
