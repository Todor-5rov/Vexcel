"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Calendar, HardDrive, Trash2, RefreshCw, ExternalLink, Eye } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface FileHistoryProps {
  user: User
  onFileSelect: (fileId: string, filename: string, mcpFilePath: string, embedUrl?: string) => void
  selectedFileId: string
  refreshTrigger?: number
}

interface UserFile {
  id: string
  file_name: string
  file_size: number
  uploaded_at: string
  mcp_filename?: string
  mcp_file_path?: string
  onedrive_file_id?: string
  onedrive_web_url?: string
  onedrive_embed_url?: string
  onedrive_uploaded_at?: string
  onedrive_folder_path?: string
}

export default function FileHistory({ user, onFileSelect, selectedFileId, refreshTrigger }: FileHistoryProps) {
  const [files, setFiles] = useState<UserFile[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchFiles()
  }, [user.id])

  // Handle refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchFiles()
    }
  }, [refreshTrigger])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("user_files")
        .select(`
          id, file_name, file_size, uploaded_at, 
          mcp_filename, mcp_file_path,
          onedrive_file_id, onedrive_web_url, onedrive_embed_url,
          onedrive_uploaded_at, onedrive_folder_path
        `)
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })

      if (error) throw error
      setFiles(data || [])
    } catch (error) {
      console.error("Error fetching files:", error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const deleteFile = async (fileId: string) => {
    try {
      setDeleting(fileId)

      // Delete from database
      const { error } = await supabase.from("user_files").delete().eq("id", fileId).eq("user_id", user.id)

      if (error) throw error

      // Remove from local state
      setFiles(files.filter((file) => file.id !== fileId))

      // If this was the selected file, clear selection
      if (selectedFileId === fileId) {
        // You might want to call a callback here to clear the selection
      }
    } catch (error) {
      console.error("Error deleting file:", error)
    } finally {
      setDeleting(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Your Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Your Files ({files.length})
          </CardTitle>
          <Button
            onClick={fetchFiles}
            variant="outline"
            size="sm"
            className="border-primary-300 text-primary-600 hover:bg-primary-50 bg-transparent"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8">
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No files uploaded yet</p>
            <p className="text-sm text-gray-400">Upload your first Excel file to get started</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedFileId === file.id
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-primary-300"
                }`}
                onClick={() => onFileSelect(file.id, file.file_name, file.mcp_file_path || "", file.onedrive_embed_url)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{file.file_name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatFileSize(file.file_size)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(file.uploaded_at)}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {file.mcp_file_path && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 mr-2">
                            MCP Ready: {file.mcp_file_path}
                          </span>
                        )}
                        {file.onedrive_embed_url && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            <Eye className="h-3 w-3 mr-1" />
                            Interactive Excel Available
                          </span>
                        )}
                      </div>
                      {file.onedrive_web_url && (
                        <div className="mt-2">
                          <a
                            href={file.onedrive_web_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open in OneDrive (Full Editor)
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFile(file.id)
                    }}
                    disabled={deleting === file.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    {deleting === file.id ? (
                      <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
