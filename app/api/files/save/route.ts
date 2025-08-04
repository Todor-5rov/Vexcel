import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { ExcelParser } from "@/lib/excel-parser"

export async function POST(request: NextRequest) {
  try {
    const { fileId, data, userId } = await request.json()

    if (!fileId || !data || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Saving file:", { fileId, dataRows: data.length, userId })

    // Get file info from database
    const { data: fileInfo, error: fileError } = await supabase
      .from("user_files")
      .select("file_name, file_path, user_id")
      .eq("id", fileId)
      .eq("user_id", userId) // Security check
      .single()

    if (fileError) {
      console.error("File not found:", fileError)
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Convert data back to file blob
    const blob = await ExcelParser.dataToBlob(data, fileInfo.file_name)

    // Upload the updated file to Supabase Storage (overwrite existing)
    const { error: uploadError } = await supabase.storage.from("excel-files").update(fileInfo.file_path, blob, {
      cacheControl: "3600",
      upsert: true,
    })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({ error: "Failed to save file" }, { status: 500 })
    }

    // Update the last_accessed timestamp in database
    const { error: updateError } = await supabase
      .from("user_files")
      .update({
        last_accessed: new Date().toISOString(),
        file_size: blob.size,
      })
      .eq("id", fileId)

    if (updateError) {
      console.error("Database update error:", updateError)
      // Don't fail the request for this, file is already saved
    }

    console.log("File saved successfully")

    return NextResponse.json({
      success: true,
      message: "File saved successfully",
      fileSize: blob.size,
    })
  } catch (error) {
    console.error("Save file error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
