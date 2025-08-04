import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    // Don't log the actual key for security
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('OPENAI') || key.includes('API')
    ),
  })
}
