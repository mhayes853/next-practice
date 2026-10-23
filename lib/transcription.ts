export const TRANSCRIPTION_MODELS = {
  whisper1: {
    tag: "openai/whisper1",
    displayName: "Whisper 1 (OpenAI)"
  },
  transcribe1: {
    tag: "fish-audio/transcribe-1",
    displayName: "Transcribe 1 (Fish Audio)"
  }
} as const

export type TranscriptionModelID = keyof typeof TRANSCRIPTION_MODELS

export type TranscriptionID = number & { _tag: "transcript" }

export type TranscriptionSegment = {
  content: string
  timestamp: number
  durationMillis: number
}

export type Transcription = {
  model: TranscriptionModelID
  segments: TranscriptionSegment[]
  language?: string
  audioDurationMillis: number
}
