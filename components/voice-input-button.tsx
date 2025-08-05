"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"
import { VoiceService } from "@/lib/voice-service"

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  onSpeakResponse?: (text: string) => void
  disabled?: boolean
  className?: string
}

export default function VoiceInputButton({
  onTranscript,
  onSpeakResponse,
  disabled = false,
  className = "",
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize voice service with ElevenLabs API key if available
    const elevenLabsKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
    if (elevenLabsKey) {
      VoiceService.initialize({
        apiKey: elevenLabsKey,
        voiceId: "EXAVITQu4vr4xnSDxMaL", // Default voice
      })
    }

    // Check if voice input is available
    setIsVoiceAvailable(VoiceService.isAvailable())
  }, [])

  const handleStartRecording = async () => {
    if (!isVoiceAvailable || disabled) return

    try {
      setError(null)
      setIsRecording(true)
      await VoiceService.startRecording()
    } catch (error) {
      console.error("Failed to start recording:", error)
      setError(error instanceof Error ? error.message : "Failed to start recording")
      setIsRecording(false)
    }
  }

  const handleStopRecording = async () => {
    if (!isRecording) return

    try {
      setIsRecording(false)
      setIsProcessing(true)

      const result = await VoiceService.stopRecording()

      if (result.text) {
        onTranscript(result.text)
      } else if (result.error) {
        setError(result.error)
      }
    } catch (error) {
      console.error("Failed to process recording:", error)
      setError(error instanceof Error ? error.message : "Failed to process recording")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSpeakResponse = async (text: string) => {
    if (!onSpeakResponse || isSpeaking) return

    try {
      setIsSpeaking(true)
      setError(null)

      const result = await VoiceService.textToSpeech(text)

      if (result.audioUrl) {
        await VoiceService.playAudio(result.audioUrl)
      } else if (result.error) {
        setError(result.error)
      }
    } catch (error) {
      console.error("Failed to speak response:", error)
      setError(error instanceof Error ? error.message : "Failed to speak response")
    } finally {
      setIsSpeaking(false)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      handleStopRecording()
    } else {
      handleStartRecording()
    }
  }

  if (!isVoiceAvailable) {
    return null // Don't show button if voice is not available
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggleRecording}
        disabled={disabled || isProcessing}
        className={`
          relative transition-all duration-300 border-2 shadow-lg hover:shadow-xl
          ${
            isRecording
              ? "border-red-400 bg-red-50 text-red-600 hover:bg-red-100 animate-pulse scale-110"
              : "border-blue-400 text-blue-600 hover:bg-blue-50 bg-white hover:scale-105"
          }
          ${className}
        `}
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mr-2" />
            Processing...
          </>
        ) : isRecording ? (
          <>
            <MicOff className="h-4 w-4 mr-2 animate-pulse" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 mr-2" />
            Voice Input
          </>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          </>
        )}

        {/* Processing indicator */}
        {isProcessing && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />}
      </Button>

      {/* Error display */}
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 shadow-sm max-w-xs z-10">
          {error}
        </div>
      )}
    </div>
  )
}
