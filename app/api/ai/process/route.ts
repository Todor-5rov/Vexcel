import { type NextRequest, NextResponse } from "next/server"
import { AIService, type AIProcessRequest } from "@/lib/ai-service"

export async function POST(request: NextRequest) {
  try {
    const body: AIProcessRequest = await request.json()

    if (!body.message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const result = await AIService.processWithAI(body)

    return NextResponse.json(result)
  } catch (error) {
    console.error("AI Process API Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        success: false,
        response: "I'm sorry, I encountered an error processing your request.",
      },
      { status: 500 },
    )
  }
}
