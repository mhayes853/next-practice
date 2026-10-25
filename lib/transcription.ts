import { UserID } from "./user"
import { base64URLDecode, base64URLEncode } from "./utils"

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

export type TranscriptionID = number

export type TranscriptionSegment = {
  content: string
  timestamp: number
  durationMillis: number
}

export type Transcription = {
  filename: string
  model: TranscriptionModelID
  segments: TranscriptionSegment[]
  language?: string
  audioDurationMillis: number
}

export type SavedTranscription = Transcription & {
  id: TranscriptionID
  userId: UserID
  createdAt: Date
  updatedAt: Date
}

export type TranscriptsCursor = {
  id: TranscriptionID
}

export function encodeCursor({ id }: TranscriptsCursor) {
  return base64URLEncode(`${id}`)
}

export function decodeCursor(encodedCursor: string) {
  try {
    return { id: parseInt(base64URLDecode(encodedCursor)) }
  } catch {
    return undefined
  }
}
