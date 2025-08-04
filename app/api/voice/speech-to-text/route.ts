import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== ElevenLabs Speech-to-Text API called ===")

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 })
    }

    // Get the audio file from the request
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const model = (formData.get("model") as string) || "eleven_multilingual_v2"

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    console.log("Processing audio file:", {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      model: model,
    })

    // Create FormData for ElevenLabs API
    const elevenLabsFormData = new FormData()
    elevenLabsFormData.append("audio", audioFile)
    elevenLabsFormData.append("model_id", model)

    // Call ElevenLabs Speech-to-Text API
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: elevenLabsFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("ElevenLabs API error:", response.status, errorText)

      let errorMessage = "Speech recognition failed"
      if (response.status === 401) {
        errorMessage = "Invalid ElevenLabs API key"
      } else if (response.status === 400) {
        errorMessage = "Audio format not supported or audio too short"
      } else if (response.status === 429) {
        errorMessage = "Rate limit exceeded. Please try again in a moment."
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const result = await response.json()
    console.log("ElevenLabs Speech-to-Text result:", result)

    // ElevenLabs returns the transcription in the 'text' field
    const transcription = result.text || result.transcript || ""

    if (!transcription || transcription.trim().length === 0) {
      return NextResponse.json({ error: "No speech detected. Please try speaking more clearly." }, { status: 400 })
    }

    return NextResponse.json({
      text: transcription.trim(),
      confidence: result.confidence || 0.9,
      model: model,
    })
  } catch (error) {
    console.error("Speech-to-text processing error:", error)
    return NextResponse.json(
      {
        error: "Failed to process speech-to-text request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
