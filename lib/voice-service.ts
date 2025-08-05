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

  // Initialize the voice service with ElevenLabs API key
  static initialize(config: VoiceConfig) {
    this.config = config
    console.log("Voice service initialized with ElevenLabs")
  }

  // Check if voice service is available - SIMPLIFIED FOR DEBUGGING
  static isAvailable(): boolean {
    console.log("🎤 VoiceService.isAvailable() called")

    // Check for basic browser support
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    const hasSpeechRecognition = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

    console.log("🎤 Media devices support:", hasMediaDevices)
    console.log("🎤 Speech recognition support:", hasSpeechRecognition)

    // For now, let's just check for basic media support
    const isAvailable = hasMediaDevices
    console.log("🎤 Voice service available:", isAvailable)

    return isAvailable
  }

  // Start voice recording for speech-to-text
  static async startRecording(): Promise<void> {
    console.log("🎤 Starting voice recording...")

    if (this.isRecording) {
      throw new Error("Already recording")
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log("🎤 Got media stream:", stream)

      this.mediaRecorder = new MediaRecorder(stream)
      this.audioChunks = []
      this.isRecording = true

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start()
      console.log("🎤 Voice recording started successfully")
    } catch (error) {
      console.error("🎤 Error starting voice recording:", error)
      throw new Error("Failed to start voice recording. Please check microphone permissions.")
    }
  }

  // Stop recording and convert to text
  static async stopRecording(): Promise<SpeechToTextResult> {
    console.log("🎤 Stopping voice recording...")

    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error("Not currently recording")
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("MediaRecorder not available"))
        return
      }

      this.mediaRecorder.onstop = async () => {
        try {
          this.isRecording = false

          // Stop all tracks to release microphone
          const stream = this.mediaRecorder?.stream
          if (stream) {
            stream.getTracks().forEach((track) => track.stop())
          }

          // Use Web Speech API for speech-to-text (free alternative)
          const result = await this.speechToTextWithWebAPI()
          resolve(result)
        } catch (error) {
          console.error("🎤 Error processing voice recording:", error)
          reject(error)
        }
      }

      this.mediaRecorder.stop()
    })
  }

  // Use Web Speech API for speech recognition (free)
  private static speechToTextWithWebAPI(): Promise<SpeechToTextResult> {
    console.log("🎤 Using Web Speech API for recognition...")

    return new Promise((resolve, reject) => {
      // @ts-ignore - Web Speech API types
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (!SpeechRecognition) {
        reject(new Error("Speech recognition not supported in this browser"))
        return
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = "en-US"

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        const confidence = event.results[0][0].confidence

        console.log("🎤 Speech recognition result:", transcript)
        resolve({
          text: transcript,
          confidence: confidence,
        })
      }

      recognition.onerror = (event: any) => {
        console.error("🎤 Speech recognition error:", event.error)
        reject(new Error(`Speech recognition failed: ${event.error}`))
      }

      recognition.onend = () => {
        console.log("🎤 Speech recognition ended")
      }

      // Start recognition
      recognition.start()
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
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
      this.isRecording = false

      // Stop all tracks
      const stream = this.mediaRecorder.stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }
}
