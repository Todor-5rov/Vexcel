export interface VoiceConfig {
  apiKey: string
  model?: string
}

export interface SpeechToTextResult {
  text: string
  confidence?: number
  error?: string
}

export class VoiceService {
  private static config: VoiceConfig | null = null
  private static mediaRecorder: MediaRecorder | null = null
  private static audioChunks: Blob[] = []
  private static isRecording = false
  private static stream: MediaStream | null = null

  // Initialize the voice service with ElevenLabs API key
  static initialize(config: VoiceConfig) {
    this.config = config
    console.log("Voice service initialized with ElevenLabs")
  }

  // Check if voice service is available
  static isAvailable(): boolean {
    return !!(
      this.config?.apiKey &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    )
  }

  // Start voice recording for speech-to-text
  static async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error("Already recording")
    }

    if (!this.config?.apiKey) {
      throw new Error("ElevenLabs API key not configured")
    }

    try {
      // Request microphone permission and start recording
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // ElevenLabs prefers 16kHz
          channelCount: 1, // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Check if MediaRecorder supports the format we need
      const options: MediaRecorderOptions = {}
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus"
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options.mimeType = "audio/mp4"
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm"
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options)
      this.audioChunks = []
      this.isRecording = true

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(100) // Collect data every 100ms
      console.log("Voice recording started with ElevenLabs")
    } catch (error) {
      console.error("Error starting voice recording:", error)
      this.cleanup()
      throw new Error("Failed to start voice recording. Please check microphone permissions.")
    }
  }

  // Stop recording and convert to text using ElevenLabs
  static async stopRecording(): Promise<SpeechToTextResult> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error("Not currently recording")
    }

    if (!this.config?.apiKey) {
      throw new Error("ElevenLabs API key not configured")
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("MediaRecorder not available"))
        return
      }

      this.mediaRecorder.onstop = async () => {
        try {
          this.isRecording = false

          // Create audio blob from recorded chunks
          const audioBlob = new Blob(this.audioChunks, {
            type: this.mediaRecorder?.mimeType || "audio/webm",
          })

          console.log("Audio recorded:", {
            size: audioBlob.size,
            type: audioBlob.type,
            duration: "unknown",
          })

          // Convert to text using ElevenLabs Speech-to-Text API
          const result = await this.speechToTextWithElevenLabs(audioBlob)
          resolve(result)
        } catch (error) {
          console.error("Error processing voice recording:", error)
          reject(error)
        } finally {
          this.cleanup()
        }
      }

      this.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event)
        this.cleanup()
        reject(new Error("Recording failed"))
      }

      this.mediaRecorder.stop()
    })
  }

  // Use ElevenLabs Speech-to-Text API
  private static async speechToTextWithElevenLabs(audioBlob: Blob): Promise<SpeechToTextResult> {
    try {
      console.log("Sending audio to server-side ElevenLabs Speech-to-Text API...")

      // Create FormData for our server API
      const formData = new FormData()
      const audioFile = new File([audioBlob], "recording.webm", {
        type: audioBlob.type,
      })

      formData.append("audio", audioFile)
      formData.append("model", this.config?.model || "eleven_multilingual_v2")

      // Call our server-side API instead of ElevenLabs directly
      const response = await fetch("/api/voice/speech-to-text", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Server Speech-to-Text API error:", response.status, errorData)

        let errorMessage = "Speech recognition failed"
        if (response.status === 401) {
          errorMessage = "Invalid ElevenLabs API key"
        } else if (response.status === 400) {
          errorMessage = errorData.error || "Audio format not supported or audio too short"
        } else if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please try again in a moment."
        } else {
          errorMessage = errorData.error || `Speech recognition error: ${response.status}`
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log("Server Speech-to-Text result:", result)

      const transcription = result.text || ""

      if (!transcription || transcription.trim().length === 0) {
        throw new Error("No speech detected. Please try speaking more clearly.")
      }

      return {
        text: transcription.trim(),
        confidence: result.confidence || 0.9,
      }
    } catch (error) {
      console.error("Speech-to-Text error:", error)

      if (error instanceof Error) {
        throw error
      }

      throw new Error("Speech recognition failed. Please try again.")
    }
  }

  // Clean up resources
  private static cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop()
        console.log("Stopped audio track:", track.kind)
      })
      this.stream = null
    }

    this.mediaRecorder = null
    this.audioChunks = []
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
      console.log("Voice recording cancelled")
    }
    this.cleanup()
  }

  // Get supported audio formats (for debugging)
  static getSupportedFormats(): string[] {
    const formats = [
      "audio/webm;codecs=opus",
      "audio/webm;codecs=vp8,opus",
      "audio/webm",
      "audio/mp4",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mpeg",
      "audio/wav",
    ]

    return formats.filter((format) => MediaRecorder.isTypeSupported(format))
  }

  // Set ElevenLabs model for speech recognition
  static setModel(model: string): void {
    if (this.config) {
      this.config.model = model
    }
  }

  // Get available ElevenLabs models
  static getAvailableModels(): string[] {
    return [
      "eleven_multilingual_v2", // Default - supports multiple languages
      "eleven_english_v2", // English only, potentially more accurate
      "eleven_multilingual_v1", // Legacy multilingual
      "eleven_english_v1", // Legacy English
    ]
  }
}
