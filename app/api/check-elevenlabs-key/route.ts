import { NextResponse } from "next/server"

export async function GET() {
  // Check if ElevenLabs API key is configured
  const hasApiKey = !!process.env.ELEVENLABS_API_KEY

  console.log("check-elevenlabs-key endpoint called:", {
    hasApiKey,
    keyLength: process.env.ELEVENLABS_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  })

  return NextResponse.json({
    hasApiKey,
    keyLength: process.env.ELEVENLABS_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    // Don't send the actual API key to the client for security
    // The client will use the server-side API for actual requests
  })
}
