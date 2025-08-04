export interface SpeechToTextResult {
  text: string
  confidence?: number
  error?: string
}

export class VoiceService {
  private static mediaRecorder: MediaRecorder | null = null
  private static recognition: any = null
  private static isRecording = false
  private static isListening = false

  // Check if voice service is available
  static isAvailable(): boolean {
    return !!(
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    )
  }

  // Start voice recording for speech-to-text using Web Speech API
  static async startRecording(): Promise<void> {
    if (this.isRecording || this.isListening) {
      throw new Error("Already recording or listening")
    }

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // @ts-ignore - Web Speech API types
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (!SpeechRecognition) {
        throw new Error("Speech recognition not supported in this browser")
      }

      this.recognition = new SpeechRecognition()
      this.recognition.continuous = false
      this.recognition.interimResults = false
      this.recognition.lang = "en-US"
      this.recognition.maxAlternatives = 1

      this.isListening = true
      this.isRecording = true

      console.log("Voice recording started")
      this.recognition.start()
    } catch (error) {
      console.error("Error starting voice recording:", error)
      this.isRecording = false
      this.isListening = false
      throw new Error("Failed to start voice recording. Please check microphone permissions.")
    }
  }

  // Stop recording and get the result
  static async stopRecording(): Promise<SpeechToTextResult> {
    if (!this.isRecording || !this.recognition) {
      throw new Error("Not currently recording")
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error("Speech recognition not available"))
        return
      }

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        const confidence = event.results[0][0].confidence

        console.log("Speech recognition result:", transcript, "Confidence:", confidence)

        this.isRecording = false
        this.isListening = false

        resolve({
          text: transcript.trim(),
          confidence: confidence,
        })
      }

      this.recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        this.isRecording = false
        this.isListening = false

        let errorMessage = "Speech recognition failed"
        switch (event.error) {
          case "no-speech":
            errorMessage = "No speech detected. Please try again."
            break
          case "audio-capture":
            errorMessage = "Microphone not accessible. Please check permissions."
            break
          case "not-allowed":
            errorMessage = "Microphone permission denied. Please allow microphone access."
            break
          case "network":
            errorMessage = "Network error. Please check your connection."
            break
          default:
            errorMessage = `Speech recognition failed: ${event.error}`
        }

        reject(new Error(errorMessage))
      }

      this.recognition.onend = () => {
        console.log("Speech recognition ended")
        this.isListening = false

        // If we haven't resolved yet, it means no result was captured
        if (this.isRecording) {
          this.isRecording = false
          reject(new Error("No speech detected. Please try again."))
        }
      }

      // Stop the recognition
      this.recognition.stop()
    })
  }

  // Check if currently recording
  static getIsRecording(): boolean {
    return this.isRecording
  }

  // Check if currently listening (for UI feedback)
  static getIsListening(): boolean {
    return this.isListening
  }

  // Cancel current recording
  static cancelRecording(): void {
    if (this.recognition && (this.isRecording || this.isListening)) {
      this.recognition.abort()
      this.isRecording = false
      this.isListening = false
      console.log("Voice recording cancelled")
    }
  }

  // Get supported languages (optional feature)
  static getSupportedLanguages(): string[] {
    return [
      "en-US", // English (US)
      "en-GB", // English (UK)
      "es-ES", // Spanish
      "fr-FR", // French
      "de-DE", // German
      "it-IT", // Italian
      "pt-BR", // Portuguese (Brazil)
      "ru-RU", // Russian
      "ja-JP", // Japanese
      "ko-KR", // Korean
      "zh-CN", // Chinese (Simplified)
    ]
  }

  // Set language for speech recognition
  static setLanguage(language: string): void {
    if (this.recognition) {
      this.recognition.lang = language
    }
  }
}
