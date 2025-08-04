"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { VoiceService } from "@/lib/voice-service"

interface VoiceInputButtonProps {
  onVoiceInput: (text: string) => void
  disabled?: boolean
  className?: string
}

export default function VoiceInputButton({ onVoiceInput, disabled = false, className = "" }: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(VoiceService.isAvailable())
  }, [])

  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording
      try {
        const result = await VoiceService.stopRecording()
        if (result.text) {
          onVoiceInput(result.text)
          setError(null)
        } else {
          setError("No speech detected")
        }
      } catch (error) {
        console.error("Voice input error:", error)
        setError(error instanceof Error ? error.message : "Voice input failed")
      } finally {
        setIsRecording(false)
        setIsListening(false)
      }
    } else {
      // Start recording
      try {
        setError(null)
        setIsRecording(true)
        await VoiceService.startRecording()
        setIsListening(true)
      } catch (error) {
        console.error("Voice input error:", error)
        setError(error instanceof Error ? error.message : "Failed to start voice input")
        setIsRecording(false)
        setIsListening(false)
      }
    }
  }

  const handleCancel = () => {
    VoiceService.cancelRecording()
    setIsRecording(false)
    setIsListening(false)
    setError(null)
  }

  if (!isSupported) {
    return null // Don't show button if not supported
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant={isRecording ? "destructive" : "outline"}
        size="sm"
        onClick={handleVoiceInput}
        disabled={disabled}
        className={`transition-all duration-200 ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
            : "border-primary-300 text-primary-600 hover:bg-primary-50 bg-transparent"
        } ${className}`}
        title={isRecording ? "Click to stop recording" : "Click to start voice input"}
      >
        {isListening ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Recording indicator */}
      {isRecording && <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-ping" />}

      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-100 text-red-800 text-xs rounded-lg shadow-lg border border-red-200 whitespace-nowrap z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-600 hover:text-red-800 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Recording status */}
      {isRecording && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-blue-100 text-blue-800 text-xs rounded-lg shadow-lg border border-blue-200 whitespace-nowrap z-50 flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          {isListening ? "Listening..." : "Processing..."}
          <button
            onClick={handleCancel}
            className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
            title="Cancel recording"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
