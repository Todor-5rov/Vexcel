'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { getVoiceService } from '@/lib/voice-service'
import { useToast } from '@/hooks/use-toast'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function VoiceInputButton({ onTranscript, disabled = false }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const { toast } = useToast()
  const voiceService = getVoiceService()

  const handleVoiceInput = async () => {
    if (!voiceService.isSupported()) {
      setIsSupported(false)
      toast({
        title: "Voice input not supported",
        description: "Your browser doesn't support speech recognition. Please try Chrome, Edge, or Safari.",
        variant: "destructive",
      })
      return
    }

    if (isListening) {
      voiceService.stopListening()
      setIsListening(false)
      return
    }

    try {
      setIsListening(true)
      const transcript = await voiceService.startListening()
      
      if (transcript.trim()) {
        onTranscript(transcript)
        toast({
          title: "Voice input successful",
          description: `Transcribed: "${transcript}"`,
        })
      } else {
        toast({
          title: "No speech detected",
          description: "Please try speaking again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Voice input error:', error)
      toast({
        title: "Voice input failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsListening(false)
    }
  }

  if (!isSupported) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="opacity-50"
      >
        <MicOff className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleVoiceInput}
      disabled={disabled}
      className={isListening ? "bg-red-50 border-red-200 text-red-600" : ""}
    >
      {isListening ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}
