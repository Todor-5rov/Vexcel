"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, RefreshCw, AlertCircle, ExternalLink, Maximize2, Eye } from "lucide-react"

interface ExcelEmbedViewerProps {
  embedUrl?: string
  filename?: string
  oneDriveWebUrl?: string
  onRefresh?: () => void
  refreshTrigger?: number
}

export default function ExcelEmbedViewer({
  embedUrl,
  filename,
  oneDriveWebUrl,
  onRefresh,
  refreshTrigger,
}: ExcelEmbedViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Add state to track if this is an editable embed
  const [isEditable, setIsEditable] = useState(true) // Default to editable

  // Handle refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      // Reload the iframe
      const iframe = document.getElementById("excel-embed-iframe") as HTMLIFrameElement
      if (iframe && embedUrl) {
        iframe.src = embedUrl
      }
    }
  }, [refreshTrigger, embedUrl])

  // Check if the embed URL contains edit permissions
  useEffect(() => {
    if (embedUrl) {
      // Check if URL contains edit parameters
      const hasEditParams = embedUrl.includes("action=embedview") || embedUrl.includes("allow_edit=true")
      setIsEditable(hasEditParams)
    }
  }, [embedUrl])

  const handleIframeLoad = () => {
    setLoading(false)
    setError(null)
  }

  const handleIframeError = () => {
    setLoading(false)
    setError("Failed to load Excel embed. The file may not be available or the embed URL may have expired.")
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (!embedUrl) {
    return (
      <div className="h-full flex flex-col">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Excel Viewer
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No Excel embed available</p>
              <p className="text-sm text-gray-400">
                This file doesn't have OneDrive embedding enabled or the upload failed
              </p>
              {oneDriveWebUrl && (
                <div className="mt-4">
                  <a
                    href={oneDriveWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in OneDrive
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className={`${isFullscreen ? "fixed inset-0 z-50 rounded-none" : "h-full"} flex flex-col`}>
        <Card className="h-full flex flex-col shadow-lg border-0 bg-white">
          <CardHeader className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-blue-25 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5 text-white" />
                  </div>
                  <div
                    className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${isEditable ? "bg-green-500" : "bg-blue-500"}`}
                  >
                    <Eye className="h-2 w-2 text-white" />
                  </div>
                </div>
                <div>
                  <div className="font-bold text-lg text-blue-700">Excel Viewer</div>
                  <div className="text-sm text-blue-600 font-normal">
                    {filename ? `${filename} (${isEditable ? "Editable" : "View Only"})` : "OneDrive Embed"}
                  </div>
                </div>
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={() => onRefresh?.()}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={toggleFullscreen}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </Button>
                {oneDriveWebUrl && (
                  <Button
                    onClick={() => window.open(oneDriveWebUrl, "_blank")}
                    variant="outline"
                    size="sm"
                    className="border-green-300 text-green-600 hover:bg-green-50 bg-transparent"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    OneDrive
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0 relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="text-gray-600">Loading Excel viewer...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">{error}</p>
                  <div className="space-y-2">
                    <Button onClick={() => onRefresh?.()} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    {oneDriveWebUrl && (
                      <div>
                        <a
                          href={oneDriveWebUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open in OneDrive
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <iframe
              id="excel-embed-iframe"
              src={embedUrl}
              style={{ display: "block", width: "100%", height: "100%", border: "none" }}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title={`Excel Viewer - ${filename || "Document"}`}
            >
              <p>Your browser does not support iframes.</p>
            </iframe>
          </CardContent>

          {/* Footer with info */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-blue-50 px-4 py-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>📊 {isEditable ? "Interactive Excel editing enabled" : "View-only mode"}</span>
                <span>•</span>
                <span>{isEditable ? "Changes sync automatically" : "Read-only access"}</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full animate-pulse ${isEditable ? "bg-green-500" : "bg-blue-500"}`}
                ></div>
                <span className="text-xs">{isEditable ? "Live Edit" : "View Only"}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleFullscreen} />}
    </>
  )
}
