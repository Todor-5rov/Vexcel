import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const hasApiKey = !!process.env.OPENAI_API_KEY
    
    return NextResponse.json({
      hasApiKey,
      configured: hasApiKey
    })
  } catch (error) {
    console.error('Error checking API key:', error)
    
    return NextResponse.json(
      { hasApiKey: false, configured: false },
      { status: 500 }
    )
  }
}
