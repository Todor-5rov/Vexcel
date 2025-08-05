"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"
import { VoiceService } from "@/lib/voice-service"

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  className?: string
}

export default function VoiceInputButton({ onTranscript, disabled = false, className = "" }: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false)

  useEffect(() => {
    // Check if voice input is available (no need for ElevenLabs for input)
    setIsVoiceAvailable(VoiceService.isAvailable())
  }, [])

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      try {
        setIsRecording(false)
        setIsProcessing(true)

        const result = await VoiceService.stopRecording()
        if (result.text) {
          onTranscript(result.text)
        }
      } catch (error) {
        console.error("Failed to process recording:", error)
      } finally {
        setIsProcessing(false)
      }
    } else {
      // Start recording
      try {
        setIsRecording(true)
        await VoiceService.startRecording()
      } catch (error) {
        console.error("Failed to start recording:", error)
        setIsRecording(false)
      }
    }
  }

  if (!isVoiceAvailable) {
    return null
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleToggleRecording}
      disabled={disabled || isProcessing}
      className={`
        relative transition-all duration-300 border-2
        ${
          isRecording
            ? "border-red-400 bg-red-50 text-red-600 hover:bg-red-100 animate-pulse"
            : "border-primary-300 text-primary-600 hover:bg-primary-50 bg-white"
        }
        ${className}
      `}
    >
      {isProcessing ? (
        <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
      ) : isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}

      {/* Recording indicator */}
      {isRecording && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />}
    </Button>
  )
}
