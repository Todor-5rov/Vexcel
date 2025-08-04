"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { supabase } from "@/lib/supabase"
import { ExcelMCPService } from "@/lib/excel-mcp-service"
import { OneDriveService } from "@/lib/onedrive-service"
import { Card, CardContent } from "@/components/ui/card"
import { FileSpreadsheet, CheckCircle, AlertCircle, X, Cloud, Upload } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface FileUploadProps {
  user: User
  onFileUploaded: (fileId: string, filename: string, mcpFilePath: string, embedUrl?: string) => void
}

export default function FileUpload({ user, onFileUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [currentStep, setCurrentStep] = useState("")

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      // Update the allowed types to match MCP server
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel", // .xls
        "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
      ]

      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|xlsm)$/i)) {
        setErrorMessage("Please upload only Excel files (.xlsx, .xls, .xlsm)")
        setUploadStatus("error")
        return
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("File size must be less than 10MB")
        setUploadStatus("error")
        return
      }

      try {
        setUploading(true)
        setUploadProgress(0)
        setUploadStatus("idle")
        setErrorMessage("")

        // Step 1: Check server health
        setCurrentStep("Checking server availability...")
        setUploadProgress(10)

        const isHealthy = await ExcelMCPService.checkServerHealth()
        if (!isHealthy) {
          throw new Error("Excel processing server is currently unavailable. Please try again later.")
        }

        // Step 2: Upload to MCP server
        setCurrentStep("Uploading to Excel processing server...")
        setUploadProgress(25)

        const mcpFile = await ExcelMCPService.uploadFile(file, user.id)
        console.log("MCP upload successful:", mcpFile)

        // Step 3: Check OneDrive status and upload
        setCurrentStep("Uploading to OneDrive for interactive editing...")
        setUploadProgress(50)

        let oneDriveResult = null
        let oneDriveError = null

        try {
          const oneDriveStatus = await OneDriveService.checkStatus()
          if (oneDriveStatus.enabled) {
            // Upload with edit permissions enabled by default
            oneDriveResult = await OneDriveService.uploadFile(file, user.id, "excel-files", true)
            console.log("OneDrive upload successful:", oneDriveResult)

            // CRITICAL: Ensure embed URL is not HTML-encoded
            if (oneDriveResult.embed_url) {
              oneDriveResult.embed_url = oneDriveResult.embed_url.replace(/&amp;/g, "&")
              console.log("Final embed URL (cleaned):", oneDriveResult.embed_url)
            }
          } else {
            console.warn("OneDrive integration is disabled")
            oneDriveError = "OneDrive integration is currently disabled"
          }
        } catch (error) {
          console.error("OneDrive upload failed:", error)
          oneDriveError = error instanceof Error ? error.message : "OneDrive upload failed"
        }

        // Step 4: Save metadata to Supabase
        setCurrentStep("Saving file information...")
        setUploadProgress(75)

        // Generate a safe filename for Supabase backup
        const fileExt = file.name.split(".").pop()
        const safeFileName = `${Date.now()}-file.${fileExt}`
        const supabaseFilePath = `${user.id}/${safeFileName}`

        // Save to Supabase storage as backup (optional)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("excel-files")
          .upload(supabaseFilePath, file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          console.warn("Supabase backup upload failed:", uploadError)
        }

        // CRITICAL: Clean embed URL before saving to database
        const cleanEmbedUrl = oneDriveResult?.embed_url ? oneDriveResult.embed_url.replace(/&amp;/g, "&") : null

        // Save metadata to database with both MCP and OneDrive info
        const { data: fileData, error: dbError } = await supabase
          .from("user_files")
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: supabaseFilePath,
            file_size: file.size,
            mcp_filename: mcpFile.filename,
            mcp_file_path: mcpFile.relative_path,
            // OneDrive fields (will be null if upload failed)
            onedrive_file_id: oneDriveResult?.onedrive_file_id || null,
            onedrive_web_url: oneDriveResult?.onedrive_web_url || null,
            onedrive_embed_url: cleanEmbedUrl,
            onedrive_uploaded_at: oneDriveResult?.created_datetime || null,
            onedrive_folder_path: oneDriveResult?.folder_path || null,
          })
          .select()
          .single()

        if (dbError) {
          console.warn("Database save failed:", dbError)
        }

        setUploadProgress(100)
        setUploadStatus("success")
        setCurrentStep("Upload complete!")

        // Show warning if OneDrive failed but MCP succeeded
        if (oneDriveError) {
          setCurrentStep(`Upload complete! (OneDrive embedding unavailable: ${oneDriveError})`)
        }

        setTimeout(() => {
          onFileUploaded(fileData?.id || "temp-id", mcpFile.filename, mcpFile.relative_path, cleanEmbedUrl)
        }, 1000)
      } catch (error) {
        console.error("Error uploading file:", error)
        setErrorMessage(error instanceof Error ? error.message : "Error uploading file. Please try again.")
        setUploadStatus("error")
      } finally {
        setUploading(false)
        setTimeout(() => {
          setUploadProgress(0)
          setUploadStatus("idle")
          setErrorMessage("")
          setCurrentStep("")
        }, 3000)
      }
    },
    [user.id, onFileUploaded],
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
    },
    multiple: false,
    disabled: uploading,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl border-0 bg-gradient-to-br from-white to-primary-25 overflow-hidden">
      <CardContent className="p-0">
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 m-6
            ${
              isDragActive && !isDragReject
                ? "border-primary-400 bg-primary-50 scale-105"
                : isDragReject
                  ? "border-red-400 bg-red-50"
                  : uploadStatus === "success"
                    ? "border-green-400 bg-green-50"
                    : uploadStatus === "error"
                      ? "border-red-400 bg-red-50"
                      : "border-primary-300 hover:border-primary-400 hover:bg-primary-25"
            }
            ${uploading ? "cursor-not-allowed" : "hover:scale-102"}
          `}
        >
          <input {...getInputProps()} />

          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-4 left-4 w-8 h-8 border-2 border-primary-300 rounded rotate-45" />
            <div className="absolute top-8 right-8 w-6 h-6 border-2 border-primary-300 rounded-full" />
            <div className="absolute bottom-8 left-8 w-4 h-4 bg-primary-300 rounded" />
            <div className="absolute bottom-4 right-4 w-10 h-10 border-2 border-primary-300 rounded rotate-12" />
          </div>

          <div className="relative z-10">
            {uploading ? (
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 mx-auto bg-primary-100 rounded-full flex items-center justify-center animate-pulse">
                    <Upload className="h-10 w-10 text-primary-500 animate-bounce" />
                  </div>
                  <div className="absolute inset-0 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                </div>
                <div className="space-y-3">
                  <p className="text-lg font-semibold text-gray-900">Processing your file...</p>
                  <p className="text-sm text-gray-600">{currentStep}</p>
                  <div className="w-full bg-primary-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                      style={{ width: `${uploadProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{Math.round(uploadProgress)}% complete</p>
                </div>
              </div>
            ) : uploadStatus === "success" ? (
              <div className="space-y-4 animate-fade-in-up">
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-500 animate-scale-in" />
                </div>
                <div>
                  <p className="text-xl font-bold text-green-700">Upload Successful!</p>
                  <p className="text-sm text-green-600 mt-2">Your file is ready for AI processing and embedding</p>
                </div>
              </div>
            ) : uploadStatus === "error" ? (
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-red-700">Upload Failed</p>
                  <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
                </div>
                <button
                  onClick={() => {
                    setUploadStatus("idle")
                    setErrorMessage("")
                  }}
                  className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  <X className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative">
                  <div
                    className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
                      isDragActive
                        ? "bg-primary-200 scale-110"
                        : "bg-gradient-to-br from-primary-100 to-primary-200 hover:scale-105"
                    }`}
                  >
                    <FileSpreadsheet
                      className={`h-10 w-10 transition-all duration-300 ${
                        isDragActive ? "text-primary-600 animate-bounce" : "text-primary-500"
                      }`}
                    />
                  </div>
                  {isDragActive && (
                    <div className="absolute inset-0 border-4 border-primary-400 rounded-full animate-ping" />
                  )}
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {isDragActive ? "Drop your file here!" : "Upload Excel File"}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {isDragActive
                      ? "Release to upload your spreadsheet"
                      : "Drag & drop your Excel file here, or click to browse"}
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      .xlsx, .xls, .xlsm
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Max 10MB
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="px-6 pb-6">
          <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Cloud className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-primary-900 mb-1">What happens next?</h4>
                <ul className="text-sm text-primary-700 space-y-1">
                  <li>• Your file will be uploaded to our Excel processing server</li>
                  <li>• File will also be uploaded to OneDrive for interactive embedding</li>
                  <li>• You'll be able to chat with your data and make complex changes</li>
                  <li>• View and edit your Excel file directly in the browser</li>
                  <li>• All changes are processed in real-time with full Excel compatibility</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
