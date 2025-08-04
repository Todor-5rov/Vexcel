import { type NextRequest, NextResponse } from "next/server"
import { AIService } from "@/lib/ai-service"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    console.log("=== AI API route called ===")

    const body = await request.json()
    const { userMessage, currentData, headers, mcpFilePath, fileId } = body

    console.log("Request data:", {
      userMessage: userMessage?.substring(0, 100) + "...",
      dataLength: currentData?.length,
      headersLength: headers?.length,
      mcpFilePath,
      fileId,
      hasApiKey: !!process.env.OPENAI_API_KEY,
    })

    if (!userMessage || !Array.isArray(currentData) || !Array.isArray(headers)) {
      console.log("Invalid request data - missing required fields")
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    if (!mcpFilePath) {
      console.log("No MCP file path provided")
      return NextResponse.json({ error: "No file path provided" }, { status: 400 })
    }

    // Get OneDrive file ID from database if we have a file ID
    let oneDriveFileId = null
    if (fileId) {
      try {
        const { data: fileInfo, error } = await supabase
          .from("user_files")
          .select("onedrive_file_id")
          .eq("id", fileId)
          .single()

        if (!error && fileInfo?.onedrive_file_id) {
          oneDriveFileId = fileInfo.onedrive_file_id
          console.log("Found OneDrive file ID for sync:", oneDriveFileId)
        }
      } catch (error) {
        console.warn("Could not fetch OneDrive file ID:", error)
      }
    }

    console.log("Processing with AI service...")
    const result = await AIService.processCommand(userMessage, currentData, headers, mcpFilePath, {
      fileId,
      oneDriveFileId,
      syncFromOneDriveFirst: false, // Set to true if you want to sync from OneDrive before operations
    })

    console.log("AI service completed successfully")

    return NextResponse.json(result)
  } catch (error) {
    console.error("=== AI processing error in route ===")
    console.error("Error:", error instanceof Error ? error.message : "Unknown error")

    return NextResponse.json(
      {
        error: "Failed to process AI request",
        response: "I encountered an error processing your request. Please try again in a moment.",
      },
      { status: 500 },
    )
  }
}
