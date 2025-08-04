"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import FileUpload from "@/components/file-upload"
import FileHistory from "@/components/file-history"
import ExcelEmbedViewer from "@/components/excel-embed-viewer"
import ChatInterface from "@/components/chat-interface"
import { FileSpreadsheet, LogOut, Home } from "lucide-react"

interface DashboardProps {
  user: User
  onAuthChange: (user: User | null) => void
}

export default function Dashboard({ user, onAuthChange }: DashboardProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>("")
  const [selectedFilename, setSelectedFilename] = useState<string>("")
  const [selectedMcpFilePath, setSelectedMcpFilePath] = useState<string>("")
  const [selectedEmbedUrl, setSelectedEmbedUrl] = useState<string>("")
  const [selectedOneDriveWebUrl, setSelectedOneDriveWebUrl] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(50) // Percentage
  const [isDragging, setIsDragging] = useState(false)

  // Add a refresh function for components
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleDataRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleSignOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUploaded = (fileId: string, filename: string, mcpFilePath: string, embedUrl?: string) => {
    console.log("File uploaded:", { fileId, filename, mcpFilePath, embedUrl })
    setSelectedFileId(fileId)
    setSelectedFilename(filename)
    setSelectedMcpFilePath(mcpFilePath)
    setSelectedEmbedUrl(embedUrl || "")
    setSelectedOneDriveWebUrl("")
    // Trigger refresh of file history
    handleDataRefresh()
  }

  const handleFileSelect = async (fileId: string, filename: string, mcpFilePath: string, embedUrl?: string) => {
    console.log("File selected:", { fileId, filename, mcpFilePath, embedUrl })
    setSelectedFileId(fileId)
    setSelectedFilename(filename)
    setSelectedMcpFilePath(mcpFilePath)
    setSelectedEmbedUrl(embedUrl || "")

    // Get OneDrive web URL from database
    try {
      const { data: fileInfo, error } = await supabase
        .from("user_files")
        .select("onedrive_web_url")
        .eq("id", fileId)
        .single()

      if (!error && fileInfo?.onedrive_web_url) {
        setSelectedOneDriveWebUrl(fileInfo.onedrive_web_url)
      }
    } catch (error) {
      console.error("Error fetching OneDrive web URL:", error)
    }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    console.log("Mouse down - starting drag")
    setIsDragging(true)
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const container = document.getElementById("resizable-container")
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      // Constrain between 20% and 80%
      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80)
      console.log("Resizing to:", constrainedWidth)
      setLeftPanelWidth(constrainedWidth)
    },
    [isDragging],
  )

  const handleMouseUp = useCallback(() => {
    console.log("Mouse up - stopping drag")
    setIsDragging(false)
  }, [])

  // Add event listeners for mouse move and up
  useEffect(() => {
    if (isDragging) {
      console.log("Adding global mouse listeners")

      // Add listeners to both document and window for maximum coverage
      const handleGlobalMouseMove = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        handleMouseMove(e)
      }

      const handleGlobalMouseUp = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        handleMouseUp()
      }

      // Add to multiple targets to ensure we catch the event
      document.addEventListener("mousemove", handleGlobalMouseMove, { passive: false, capture: true })
      document.addEventListener("mouseup", handleGlobalMouseUp, { passive: false, capture: true })
      window.addEventListener("mousemove", handleGlobalMouseMove, { passive: false })
      window.addEventListener("mouseup", handleGlobalMouseUp, { passive: false })

      // Prevent text selection and set cursor globally
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      document.body.style.webkitUserSelect = "none"

      // Prevent default drag behavior
      const preventDrag = (e: Event) => e.preventDefault()
      document.addEventListener("dragstart", preventDrag)

      return () => {
        console.log("Cleaning up mouse listeners")
        document.removeEventListener("mousemove", handleGlobalMouseMove, { capture: true })
        document.removeEventListener("mouseup", handleGlobalMouseUp, { capture: true })
        window.removeEventListener("mousemove", handleGlobalMouseMove)
        window.removeEventListener("mouseup", handleGlobalMouseUp)
        document.removeEventListener("dragstart", preventDrag)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        document.body.style.webkitUserSelect = ""
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Additional cleanup effect with multiple escape routes
  useEffect(() => {
    const handleEscapeResize = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDragging) {
        console.log("Escape key pressed - stopping drag")
        setIsDragging(false)
      }
    }

    const handleGlobalClick = () => {
      if (isDragging) {
        console.log("Global click detected - stopping drag")
        setIsDragging(false)
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && isDragging) {
        console.log("Tab became hidden - stopping drag")
        setIsDragging(false)
      }
    }

    // Multiple escape routes
    document.addEventListener("keydown", handleEscapeResize)
    document.addEventListener("click", handleGlobalClick, { capture: true })
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Backup timer to force stop after 10 seconds (safety net)
    let backupTimer: NodeJS.Timeout | null = null
    if (isDragging) {
      backupTimer = setTimeout(() => {
        console.log("Backup timer - forcing stop drag")
        setIsDragging(false)
      }, 10000)
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeResize)
      document.removeEventListener("click", handleGlobalClick, { capture: true })
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (backupTimer) {
        clearTimeout(backupTimer)
      }
    }
  }, [isDragging])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Navigation */}
      <nav className="flex-shrink-0 bg-white border-b border-primary-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <FileSpreadsheet className="h-8 w-8 text-primary-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse" />
              </div>
              <span className="font-bold text-2xl bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                VExcel
              </span>
            </div>
            <div className="flex items-center gap-4">
              {selectedFilename && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFileId("")
                    setSelectedFilename("")
                    setSelectedMcpFilePath("")
                    setSelectedEmbedUrl("")
                    setSelectedOneDriveWebUrl("")
                  }}
                  className="border-primary-300 text-primary-600 hover:bg-primary-50 bg-transparent"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              )}
              <div className="flex items-center gap-3">
                <div className="text-sm text-right">
                  <p className="font-medium text-gray-900">{user.user_metadata?.full_name}</p>
                  <p className="text-gray-500">{user.email}</p>
                </div>
                {user.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url || "/placeholder.svg"}
                    alt="Profile"
                    className="w-10 h-10 rounded-full border-2 border-primary-200"
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="border-primary-300 text-primary-600 hover:bg-primary-50 bg-transparent"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {!selectedFilename ? (
          <div className="h-full overflow-auto">
            <div className="container mx-auto p-6 space-y-8">
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl p-8">
                <div className="max-w-2xl">
                  <h1 className="text-3xl font-bold mb-2">
                    Welcome back, {user.user_metadata?.full_name?.split(" ")[0]}! 👋
                  </h1>
                  <p className="text-primary-100 text-lg">
                    Ready to transform your Excel files with AI? Upload a new file or continue working with your
                    existing data. Now with voice commands and interactive OneDrive embedding!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-primary-600">Upload New File</h2>
                  <FileUpload user={user} onFileUploaded={handleFileUploaded} />
                </div>
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-primary-600">Your Files</h2>
                  <FileHistory
                    user={user}
                    onFileSelect={handleFileSelect}
                    selectedFileId={selectedFileId}
                    refreshTrigger={refreshTrigger}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            id="resizable-container"
            className={`h-full flex relative ${isDragging ? "select-none" : ""}`}
            style={{ cursor: isDragging ? "col-resize" : "default" }}
          >
            {/* Iframe Overlay - Prevents iframe from capturing mouse events during resize */}
            {isDragging && (
              <div
                className="absolute inset-0 z-50 bg-transparent cursor-col-resize"
                style={{ pointerEvents: "all" }}
                onMouseUp={handleMouseUp}
                onClick={handleMouseUp}
              />
            )}

            {/* Left Panel - Chat Interface */}
            <div className="h-full overflow-hidden relative z-10" style={{ width: `${leftPanelWidth}%` }}>
              <ChatInterface
                fileId={selectedFileId}
                mcpFilePath={selectedMcpFilePath}
                onRefreshData={handleDataRefresh}
                userId={user.id}
              />
            </div>

            {/* Resize Handle */}
            <div
              className={`w-2 bg-gray-300 hover:bg-primary-400 cursor-col-resize transition-colors duration-200 relative group flex-shrink-0 z-20 ${
                isDragging ? "bg-primary-500" : ""
              }`}
              onMouseDown={handleMouseDown}
              style={{ cursor: "col-resize" }}
            >
              {/* Visual indicator */}
              <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-white/50 group-hover:bg-white/80" />
              <div className="absolute inset-y-0 -left-2 -right-2 group-hover:bg-primary-400/20 transition-colors duration-200" />

              {/* Extended hit area for easier grabbing */}
              <div className="absolute inset-y-0 -left-4 -right-4" />
            </div>

            {/* Right Panel - Excel Embed Viewer */}
            <div className="h-full overflow-hidden flex-1 relative z-10">
              <ExcelEmbedViewer
                embedUrl={selectedEmbedUrl}
                filename={selectedFilename}
                oneDriveWebUrl={selectedOneDriveWebUrl}
                onRefresh={handleDataRefresh}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
