import { NextResponse } from "next/server"

export async function GET() {
  // Check if OpenAI API key is configured
  const hasApiKey = !!process.env.OPENAI_API_KEY
  
  console.log("check-api-key endpoint called:", {
    hasApiKey,
    keyLength: process.env.OPENAI_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV
  })

  return NextResponse.json({ 
    hasApiKey,
    keyLength: process.env.OPENAI_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV
  })
}
