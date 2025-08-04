import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function GET() {
  try {
    console.log("Testing OpenAI API...")
    console.log("API Key exists:", !!process.env.OPENAI_API_KEY)
    console.log("API Key length:", process.env.OPENAI_API_KEY?.length)

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "No API key found" }, { status: 400 })
    }

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: "Say 'Hello, this is a test!' in exactly those words.",
      maxTokens: 50,
    })

    console.log("OpenAI response:", text)

    return NextResponse.json({
      success: true,
      response: text,
      apiKeyConfigured: true,
    })
  } catch (error) {
    console.error("OpenAI test error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        apiKeyConfigured: !!process.env.OPENAI_API_KEY,
      },
      { status: 500 },
    )
  }
}
