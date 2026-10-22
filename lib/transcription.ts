import { transcribe } from "ai";

const TRANSCRIPTION_MODELS = {
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

export function displayName(model: TranscriptionModelID) {
  return TRANSCRIPTION_MODELS[model].displayName
}

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
    model: TRANSCRIPTION_MODELS[model].tag,
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
