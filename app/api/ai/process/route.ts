import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userMessage, currentData, headers, mcpFilePath, fileId } = body

    if (!userMessage) {
      return NextResponse.json(
        { error: 'User message is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const aiService = new AIService()
    const fileName = mcpFilePath?.split('/').pop() || 'Unknown File'
    
    const response = await aiService.processQuery(
      userMessage,
      currentData || [],
      headers || [],
      fileName
    )

    return NextResponse.json({
      response,
      fileModified: false, // For now, we're not modifying files
      newData: null
    })

  } catch (error) {
    console.error('AI processing error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
