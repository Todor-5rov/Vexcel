export interface VoiceConfig {
  apiKey?: string
  model?: string
  language?: string
}

export interface SpeechToTextResult {
  text: string
  confidence?: number
  error?: string
}

export class VoiceService {
  private static config: VoiceConfig | null = null
  private static recognition: SpeechRecognition | null = null
  private static isRecording = false

  // Initialize the voice service with browser Speech Recognition
  static initialize(config: VoiceConfig = {}) {
    this.config = { language: 'en-US', ...config }
    console.log("Voice service initialized with Web Speech API")
  }

  // Check if voice service is available
  static isAvailable(): boolean {
    return !!(
      'webkitSpeechRecognition' in window || 
      'SpeechRecognition' in window
    )
  }

  // Start voice recording for speech-to-text
  static async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error("Already recording")
    }

    if (!this.isAvailable()) {
      throw new Error("Speech recognition not supported in this browser")
    }

    try {
      // Create speech recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SpeechRecognition()

      // Configure recognition settings
      this.recognition.continuous = false
      this.recognition.interimResults = false
      this.recognition.lang = this.config?.language || 'en-US'
      this.recognition.maxAlternatives = 1

      this.isRecording = true
      console.log("Voice recording started with Web Speech API")

      // Start recognition
      this.recognition.start()
    } catch (error) {
      console.error("Error starting voice recording:", error)
      this.cleanup()
      throw new Error("Failed to start voice recording. Please check microphone permissions.")
    }
  }

  // Stop recording and get result
  static async stopRecording(): Promise<SpeechToTextResult> {
    if (!this.isRecording || !this.recognition) {
      throw new Error("Not currently recording")
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error("Speech recognition not available"))
        return
      }

      // Set up event handlers
      this.recognition.onresult = (event) => {
        try {
          this.isRecording = false
          
          if (event.results.length > 0) {
            const result = event.results[0]
            const transcript = result[0].transcript
            const confidence = result[0].confidence || 0.9

            console.log("Speech recognition result:", { transcript, confidence })

            if (transcript && transcript.trim().length > 0) {
              resolve({
                text: transcript.trim(),
                confidence: confidence,
              })
            } else {
              reject(new Error("No speech detected. Please try speaking more clearly."))
            }
          } else {
            reject(new Error("No speech detected. Please try again."))
          }
        } catch (error) {
          console.error("Error processing speech result:", error)
          reject(new Error("Failed to process speech recognition result"))
        } finally {
          this.cleanup()
        }
      }

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        this.isRecording = false
        this.cleanup()

        let errorMessage = "Speech recognition failed"
        switch (event.error) {
          case 'no-speech':
            errorMessage = "No speech detected. Please try speaking more clearly."
            break
          case 'audio-capture':
            errorMessage = "Microphone not accessible. Please check permissions."
            break
          case 'not-allowed':
            errorMessage = "Microphone permission denied. Please allow microphone access."
            break
          case 'network':
            errorMessage = "Network error. Please check your internet connection."
            break
          case 'aborted':
            errorMessage = "Speech recognition was cancelled."
            break
          default:
            errorMessage = `Speech recognition error: ${event.error}`
        }

        reject(new Error(errorMessage))
      }

      this.recognition.onend = () => {
        console.log("Speech recognition ended")
        this.isRecording = false
      }

      // Stop recognition if it's running
      if (this.isRecording) {
        this.recognition.stop()
      }
    })
  }

  // Clean up resources
  private static cleanup(): void {
    if (this.recognition) {
      this.recognition.onresult = null
      this.recognition.onerror = null
      this.recognition.onend = null
      this.recognition = null
    }
  }

  // Check if currently recording
  static getIsRecording(): boolean {
    return this.isRecording
  }

  // Cancel current recording
  static cancelRecording(): void {
    if (this.recognition && this.isRecording) {
      this.recognition.abort()
      this.isRecording = false
      console.log("Voice recording cancelled")
    }
    this.cleanup()
  }

  // Get supported languages (for debugging)
  static getSupportedLanguages(): string[] {
    return [
      'en-US', // English (US)
      'en-GB', // English (UK)
      'en-AU', // English (Australia)
      'en-CA', // English (Canada)
      'es-ES', // Spanish (Spain)
      'es-MX', // Spanish (Mexico)
      'fr-FR', // French (France)
      'de-DE', // German (Germany)
      'it-IT', // Italian (Italy)
      'pt-BR', // Portuguese (Brazil)
      'ja-JP', // Japanese (Japan)
      'ko-KR', // Korean (South Korea)
      'zh-CN', // Chinese (Simplified)
      'zh-TW', // Chinese (Traditional)
    ]
  }

  // Set language for speech recognition
  static setLanguage(language: string): void {
    if (this.config) {
      this.config.language = language
    }
  }

  // Check browser support
  static getBrowserSupport(): { supported: boolean; api: string } {
    if ('SpeechRecognition' in window) {
      return { supported: true, api: 'SpeechRecognition' }
    } else if ('webkitSpeechRecognition' in window) {
      return { supported: true, api: 'webkitSpeechRecognition' }
    } else {
      return { supported: false, api: 'none' }
    }
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
