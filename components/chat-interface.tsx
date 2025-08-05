"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Bot, User, Zap, MessageSquare, AlertTriangle, Cloud, FolderSyncIcon as Sync, Mic } from "lucide-react"
import VoiceInputButton from "@/components/voice-input-button"
import { ChatService } from "@/lib/chat-service"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  type?: "suggestion" | "normal" | "error"
  voiceInput?: boolean
}

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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
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

  // Initialize chat when file changes
  useEffect(() => {
    const initializeChat = async () => {
      if (fileId && userId) {
        try {
          // Load existing messages for this file
          const existingMessages = await ChatService.loadMessagesForFile(userId, fileId)

          if (existingMessages.length > 0) {
            // Convert to local message format
            const convertedMessages: Message[] = existingMessages.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
              type: msg.messageType as "suggestion" | "normal" | "error",
              voiceInput: msg.voiceInput,
            }))
            setMessages(convertedMessages)
          } else {
            // Set welcome message for new file
            const welcomeMessage: Message = {
              id: "welcome",
              role: "assistant",
              content: getWelcomeMessage(),
              timestamp: new Date(),
            }
            setMessages([welcomeMessage])
          }
        } catch (error) {
          console.error("Failed to initialize chat:", error)
          // Fallback to local-only chat
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: getWelcomeMessage(),
              timestamp: new Date(),
            },
          ])
        }
      } else {
        // No file selected, show default message
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              "Hello! I'm your VExcel AI assistant. Upload a file first, and I'll help you manipulate your Excel data using natural language commands with advanced Excel operations and real-time OneDrive sync.",
            timestamp: new Date(),
          },
        ])
      }
    }

    initializeChat()
  }, [fileId, userId])

  const getWelcomeMessage = () => {
    if (currentData.length > 0 && headers.length > 0) {
      const filename = mcpFilePath?.split("/").pop() || "your file"
      return `Hello! I can see your spreadsheet "${filename}" with ${currentData.length - 1} rows and columns: ${headers.join(", ")}. I can help you manipulate this data using natural language. Try asking me to "sort by ${headers[0]}", "calculate averages", or "add a new column". All changes will be automatically synced to OneDrive for real-time collaboration! 🎤 You can also use voice input to speak your commands.`
    }
    return "Hello! Upload an Excel file and I'll help you manipulate your data using natural language commands with advanced Excel operations and real-time OneDrive sync. 🎤 You can use voice input to speak your commands!"
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleVoiceTranscript = (transcript: string) => {
    setInput(transcript)
  }

  const handleSend = async (message?: string, isVoiceInput = false) => {
    const messageText = message || input.trim()
    if (!messageText || isLoading || !userId || !fileId) return

    console.log("=== HANDLE SEND DEBUG ===")
    console.log("Sending message:", messageText)
    console.log("Voice input:", isVoiceInput)
    console.log("MCP File Path:", mcpFilePath)
    console.log("File ID:", fileId)
    console.log("User ID:", userId)
    console.log("Has API key (state):", hasApiKey)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
      voiceInput: isVoiceInput,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Save user message to database
    if (userId && fileId) {
      try {
        await ChatService.saveMessageForFile(userId, fileId, "user", messageText, {
          messageType: "normal",
          voiceInput: isVoiceInput,
        })
      } catch (error) {
        console.error("Failed to save user message:", error)
      }
    }

    try {
      if (!hasApiKey) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "I understand your request, but I need an OpenAI API key to process natural language commands. Please add your OpenAI API key to the environment variables.",
          timestamp: new Date(),
          type: "error",
        }
        setMessages((prev) => [...prev, errorMessage])

        // Save error message
        if (userId && fileId) {
          await ChatService.saveMessageForFile(userId, fileId, "assistant", errorMessage.content, {
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
          fileId: fileId || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log("Server AI result:", result)

      const cleanedResponse = cleanMarkdown(result.response)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: cleanedResponse,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Save assistant message to database
      if (userId && fileId) {
        try {
          await ChatService.saveMessageForFile(userId, fileId, "assistant", cleanedResponse, {
            messageType: "normal",
          })
        } catch (error) {
          console.error("Failed to save assistant message:", error)
        }
      }

      // If file was modified, refresh the data
      if (result.fileModified && onRefreshData) {
        setTimeout(() => {
          onRefreshData()
        }, 2000)
      }

      // If we have new data, update it
      if (result.newData && onDataUpdate) {
        onDataUpdate(result.newData)
      }
    } catch (error) {
      console.error("AI processing error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I encountered an error processing your request: ${error instanceof Error ? error.message : "Unknown error"}. Please try again or rephrase your command.`,
        timestamp: new Date(),
        type: "error",
      }
      setMessages((prev) => [...prev, errorMessage])

      // Save error message
      if (userId && fileId) {
        try {
          await ChatService.saveMessageForFile(userId, fileId, "assistant", errorMessage.content, {
            messageType: "error",
          })
        } catch (error) {
          console.error("Failed to save error message:", error)
        }
      }
    } finally {
      setIsLoading(false)
    }
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

  const canChat = mcpFilePath && hasApiKey && userId && fileId
  const filename = mcpFilePath?.split("/").pop() || ""

  return (
    <div className="h-full flex flex-col">
      <Card className="h-full flex flex-col shadow-xl border-0 bg-gradient-to-br from-white to-primary-25 overflow-hidden">
        <CardHeader className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-primary-100">
          <CardTitle className="flex items-center justify-between text-primary-600">
            <div className="flex items-center gap-3">
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
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages - This is the scrollable area */}
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
                      message.type === "error"
                        ? "bg-gradient-to-r from-red-500 to-red-600"
                        : "bg-gradient-to-r from-primary-500 to-primary-600"
                    }`}
                  >
                    {message.type === "error" ? (
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
                      : message.type === "error"
                        ? "bg-red-50 text-red-900 border border-red-200"
                        : "bg-white text-gray-900 border border-primary-100"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div
                      className={`absolute -left-2 top-4 w-4 h-4 border-l border-b transform rotate-45 ${
                        message.type === "error" ? "bg-red-50 border-red-200" : "bg-white border-primary-100"
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
                        : message.type === "error"
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
                          : message.type === "error"
                            ? "text-red-600"
                            : "text-gray-500"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                    {message.voiceInput && (
                      <div className="flex items-center gap-1 text-xs text-primary-200">
                        <Mic className="h-3 w-3" />
                        Voice
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

          {/* Service Status Warning */}
          {(!hasApiKey || !mcpFilePath || !userId || !fileId) && (
            <div className="flex-shrink-0 border-t border-yellow-200 p-4 bg-yellow-50/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">Service Status</span>
              </div>
              <div className="text-xs text-yellow-600 space-y-1">
                {!hasApiKey && <p>• OpenAI API key not configured</p>}
                {!mcpFilePath && <p>• No file selected for processing</p>}
                {!userId && <p>• User not authenticated</p>}
                {!fileId && <p>• No file ID available</p>}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {currentData.length > 0 && messages.length <= 2 && canChat && (
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
                        : !userId
                          ? "Please sign in to chat"
                          : !fileId
                            ? "No file selected"
                            : "Ask me to modify your Excel data or use voice input..."
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

              {/* Simplified Voice Input Button */}
              <VoiceInputButton
                onTranscript={handleVoiceTranscript}
                disabled={!canChat || isLoading}
                className="h-12"
              />

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
        </CardContent>
      </Card>
    </div>
  )
}
