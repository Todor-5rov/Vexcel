import { type NextRequest, NextResponse } from "next/server"
import { AIService } from "@/lib/ai-service"

export async function POST(request: NextRequest) {
  try {
    const { query, data } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const response = await AIService.processExcelQuery(query, data || [])

    return NextResponse.json({
      success: true,
      response,
    })
  } catch (error) {
    console.error("AI processing error:", error)
    return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 })
  }
}
