export interface VoiceConfig {
  apiKey: string
  voiceId?: string
  model?: string
}

export interface SpeechToTextResult {
  text: string
  confidence?: number
  error?: string
}

export interface TextToSpeechResult {
  audioUrl: string
  error?: string
}

export class VoiceService {
  private static config: VoiceConfig | null = null
  private static mediaRecorder: MediaRecorder | null = null
  private static audioChunks: Blob[] = []
  private static isRecording = false
  private static recognition: any = null

  // Initialize the voice service with ElevenLabs API key
  static initialize(config: VoiceConfig) {
    this.config = config
    console.log("Voice service initialized with ElevenLabs")
  }

  // Check if voice service is available
  static isAvailable(): boolean {
    console.log("🎤 VoiceService.isAvailable() called")

    // Check for basic browser support
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    const hasSpeechRecognition = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

    console.log("🎤 Media devices support:", hasMediaDevices)
    console.log("🎤 Speech recognition support:", hasSpeechRecognition)

    // Need both for voice input to work
    const isAvailable = hasMediaDevices && hasSpeechRecognition
    console.log("🎤 Voice service available:", isAvailable)

    return isAvailable
  }

  // Start voice recording for speech-to-text using Web Speech API directly
  static async startRecording(): Promise<void> {
    console.log("🎤 Starting voice recording with Web Speech API...")

    if (this.isRecording) {
      throw new Error("Already recording")
    }

    try {
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log("🎤 Got microphone permission")

      // Stop the stream immediately since we're using Web Speech API
      stream.getTracks().forEach((track) => track.stop())

      // Use Web Speech API directly
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (!SpeechRecognition) {
        throw new Error("Speech recognition not supported in this browser")
      }

      this.recognition = new SpeechRecognition()
      this.recognition.continuous = true // Keep listening
      this.recognition.interimResults = true // Show interim results
      this.recognition.lang = "en-US"
      this.recognition.maxAlternatives = 1

      this.isRecording = true
      console.log("🎤 Starting speech recognition...")

      this.recognition.start()
      console.log("🎤 Voice recording started successfully")
    } catch (error) {
      console.error("🎤 Error starting voice recording:", error)
      this.isRecording = false
      throw new Error("Failed to start voice recording. Please check microphone permissions.")
    }
  }

  // Stop recording and get the result
  static async stopRecording(): Promise<SpeechToTextResult> {
    console.log("🎤 Stopping voice recording...")

    if (!this.isRecording || !this.recognition) {
      throw new Error("Not currently recording")
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error("Speech recognition not available"))
        return
      }

      let finalTranscript = ""
      let hasResult = false

      this.recognition.onresult = (event: any) => {
        console.log("🎤 Speech recognition result event:", event)

        let interimTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript

          if (event.results[i].isFinal) {
            finalTranscript += transcript
            hasResult = true
            console.log("🎤 Final transcript:", finalTranscript)
          } else {
            interimTranscript += transcript
            console.log("🎤 Interim transcript:", interimTranscript)
          }
        }
      }

      this.recognition.onend = () => {
        console.log("🎤 Speech recognition ended")
        this.isRecording = false

        if (hasResult && finalTranscript.trim()) {
          resolve({
            text: finalTranscript.trim(),
            confidence: 0.8, // Default confidence
          })
        } else {
          // If no final result, try to use any interim results
          reject(new Error("No speech detected. Please speak clearly and try again."))
        }
      }

      this.recognition.onerror = (event: any) => {
        console.error("🎤 Speech recognition error:", event.error)
        this.isRecording = false

        let errorMessage = "Speech recognition failed"

        switch (event.error) {
          case "no-speech":
            errorMessage = "No speech detected. Please speak louder and try again."
            break
          case "audio-capture":
            errorMessage = "Microphone not accessible. Please check permissions."
            break
          case "not-allowed":
            errorMessage = "Microphone permission denied. Please allow microphone access."
            break
          case "network":
            errorMessage = "Network error. Please check your internet connection."
            break
          case "aborted":
            errorMessage = "Speech recognition was stopped."
            break
          default:
            errorMessage = `Speech recognition error: ${event.error}`
        }

        reject(new Error(errorMessage))
      }

      // Stop the recognition
      this.recognition.stop()
    })
  }

  // Convert text to speech using ElevenLabs
  static async textToSpeech(text: string): Promise<TextToSpeechResult> {
    if (!this.config?.apiKey) {
      throw new Error("ElevenLabs API key not configured")
    }

    try {
      const voiceId = this.config.voiceId || "EXAVITQu4vr4xnSDxMaL" // Default voice
      const model = this.config.model || "eleven_monolingual_v1"

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": this.config.apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      return { audioUrl }
    } catch (error) {
      console.error("Text-to-speech error:", error)
      return {
        audioUrl: "",
        error: error instanceof Error ? error.message : "Text-to-speech failed",
      }
    }
  }

  // Play audio from URL
  static async playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl)

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl) // Clean up
        resolve()
      }

      audio.onerror = () => {
        reject(new Error("Failed to play audio"))
      }

      audio.play().catch(reject)
    })
  }

  // Check if currently recording
  static getIsRecording(): boolean {
    return this.isRecording
  }

  // Cancel current recording
  static cancelRecording(): void {
    console.log("🎤 Cancelling voice recording...")

    if (this.recognition && this.isRecording) {
      this.recognition.stop()
      this.recognition = null
      this.isRecording = false
    }
  }
}
