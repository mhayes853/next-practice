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
  date: Date
}

export function encodeCursor({ id, date }: TranscriptsCursor) {
  return base64URLEncode(`${id}|${date.toISOString()}`)
}

export function decodeCursor(encodedCursor: string) {
  try {
    const splits = base64URLDecode(encodedCursor).split("|", 2)
    if (splits.length < 2) return undefined
    return { id: parseInt(splits[0]), date: new Date(splits[1]) }
  } catch {
    return undefined
  }
}
