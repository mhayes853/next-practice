import { transcribe } from "ai";

const TRANSCRIPTION_MODELS = {
  whisper1: "openai/whisper1"
} as const

export type TranscriptionModelID = keyof typeof TRANSCRIPTION_MODELS

export type TranscriptionSegment = {
  content: string
  timestamp: number
  durationMillis: number
}

export type Transcription = {
  model: TranscriptionModelID,
  segments: TranscriptionSegment[],
  language?: string
  audioDurationMillis: number
}

export async function transcribeBlob(
  blob: Blob,
  model: TranscriptionModelID
): Promise<Transcription> {
  const result = await transcribe({
    model: TRANSCRIPTION_MODELS[model],
    audio: await blob.bytes()
  });
  return {
    model,
    segments: result.segments
      .map((s) => ({
        content: s.text,
        timestamp: s.startSecond * 1000,
        durationMillis: (s.endSecond - s.startSecond) * 1000
      })),
    language: result.language,
    audioDurationMillis: (result.durationInSeconds ?? 0) * 1000
  }
}
