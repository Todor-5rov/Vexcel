"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Loader2, Zap } from 'lucide-react'
import { VoiceService } from "@/lib/voice-service"

interface VoiceInputButtonProps {
  onVoiceInput: (text: string) => void
  disabled?: boolean
  className?: string
}

export default function VoiceInputButton({ onVoiceInput, disabled = false, className = "" }: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize Web Speech API Voice Service
    const initializeVoiceService = async () => {
      try {
        // Check if Web Speech API is supported
        const browserSupport = VoiceService.getBrowserSupport()
        
        if (browserSupport.supported) {
          VoiceService.initialize({
            language: 'en-US', // Default to English
          })

          setIsSupported(VoiceService.isAvailable())
          setIsInitialized(true)
          console.log(`Web Speech API initialized with ${browserSupport.api}`)
        } else {
          console.warn("Web Speech API not supported in this browser")
          setIsSupported(false)
        }
      } catch (error) {
        console.error("Failed to initialize voice service:", error)
        setIsSupported(false)
      }
    }

    initializeVoiceService()
  }, [])

  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording and process
      try {
        setIsProcessing(true)
        setError(null)

        console.log("Stopping recording and processing with Web Speech API...")
        const result = await VoiceService.stopRecording()

        if (result.text && result.text.trim().length > 0) {
          console.log("Speech-to-text result:", result.text)
          onVoiceInput(result.text)
          setError(null)
        } else {
          setError("No speech detected. Please try again.")
        }
      } catch (error) {
        console.error("Voice input error:", error)
        setError(error instanceof Error ? error.message : "Voice input failed")
      } finally {
        setIsRecording(false)
        setIsProcessing(false)
      }
    } else {
      // Start recording
      try {
        setError(null)
        setIsRecording(true)

        console.log("Starting Web Speech API voice recording...")
        await VoiceService.startRecording()

        console.log("Recording started successfully")
      } catch (error) {
        console.error("Voice input error:", error)
        setError(error instanceof Error ? error.message : "Failed to start voice input")
        setIsRecording(false)
      }
    }
  }

  const handleCancel = () => {
    VoiceService.cancelRecording()
    setIsRecording(false)
    setIsProcessing(false)
    setError(null)
  }

  // Don't show button if not supported or not initialized
  if (!isSupported || !isInitialized) {
    return null
  }

  const buttonState = isProcessing ? "processing" : isRecording ? "recording" : "idle"

  return (
    <div className="relative">
      <Button
        type="button"
        variant={buttonState === "recording" ? "destructive" : "outline"}
        size="sm"
        onClick={handleVoiceInput}
        disabled={disabled || isProcessing}
        className={`transition-all duration-200 ${
          buttonState === "recording"
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
            : buttonState === "processing"
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "border-primary-300 text-primary-600 hover:bg-primary-50 bg-transparent"
        } ${className}`}
        title={
          buttonState === "recording"
            ? "Click to stop recording"
            : buttonState === "processing"
              ? "Processing with Web Speech API..."
              : "Click to start voice input with Web Speech API"
        }
      >
        {buttonState === "processing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : buttonState === "recording" ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Recording indicator */}
      {isRecording && <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-ping" />}

      {/* Processing indicator */}
      {isProcessing && <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />}

      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-100 text-red-800 text-xs rounded-lg shadow-lg border border-red-200 whitespace-nowrap z-50 max-w-xs">
          <div className="flex items-center gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold flex-shrink-0">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Recording status */}
      {(isRecording || isProcessing) && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-blue-100 text-blue-800 text-xs rounded-lg shadow-lg border border-blue-200 whitespace-nowrap z-50 flex items-center gap-2">
          {isProcessing ? (
            <>
              <Zap className="w-3 h-3 animate-pulse" />
              <span>Processing with Web Speech API...</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>Recording with Web Speech API...</span>
            </>
          )}
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
