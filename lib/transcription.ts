import z from "zod"
import { UserIDSchema } from "./user"
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

export const TranscriptionModelIDSchema = z.enum(
  Object.keys(TRANSCRIPTION_MODELS) as TranscriptionModelID[]
)

export type TranscriptionModelID = keyof typeof TRANSCRIPTION_MODELS

export const TranscriptionIDSchema: z.ZodType<TranscriptionID> = z.number()

export type TranscriptionID = number

export const TranscriptionSegmentSchema = z.object({
  content: z.string(),
  timestamp: z.number(),
  durationMillis: z.number()
})

export type TranscriptionSegment = z.infer<typeof TranscriptionSegmentSchema>

export const TranscriptionSchema = z.object({
  filename: z.string(),
  model: TranscriptionModelIDSchema,
  segments: z.array(TranscriptionSegmentSchema),
  language: z.string().nullable(),
  audioDurationMillis: z.number()
})

export type Transcription = z.infer<typeof TranscriptionSchema>

export const SavedTranscriptionSchema = TranscriptionSchema.extend({
  id: TranscriptionIDSchema,
  userId: UserIDSchema,
  createdAt: z.iso.datetime().pipe(z.coerce.date()),
  updatedAt: z.iso.datetime().pipe(z.coerce.date())
})

export type SavedTranscription = z.infer<typeof SavedTranscriptionSchema>

export type SerializeableTranscription = Omit<
  SavedTranscription,
  "createdAt" | "updatedAt"
> & {
  createdAt: string
  updatedAt: string
}

export function serialize(
  transcription: SavedTranscription
): SerializeableTranscription {
  return {
    ...transcription,
    createdAt: transcription.createdAt.toISOString(),
    updatedAt: transcription.updatedAt.toISOString()
  }
}

export function deserialize(
  transcription: SerializeableTranscription
): SavedTranscription {
  return {
    ...transcription,
    createdAt: new Date(transcription.createdAt),
    updatedAt: new Date(transcription.updatedAt)
  }
}

export type TranscriptionsCursor = {
  id: TranscriptionID
}

export function encodeCursor({ id }: TranscriptionsCursor) {
  return base64URLEncode(`${id}`)
}

export function decodeCursor(encodedCursor: string) {
  try {
    const id = parseInt(base64URLDecode(encodedCursor))
    if (isNaN(id) || !isFinite(id)) return undefined
    return { id }
  } catch {
    return undefined
  }
}

export const TranscriptionsPageSchema = z.object({
  transcriptions: z.array(SavedTranscriptionSchema),
  nextCursor: z.string().nullable()
})

export type TranscriptionsPage = z.infer<typeof TranscriptionsPageSchema>

export const DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT = 10
