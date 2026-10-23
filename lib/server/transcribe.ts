import { transcribe } from "ai"
import {
  TranscriptionModelID,
  Transcription,
  TRANSCRIPTION_MODELS
} from "../transcription"

export async function transcribeBlob(
  blob: Blob,
  model: TranscriptionModelID
): Promise<Transcription> {
  const result = await transcribe({
    model: TRANSCRIPTION_MODELS[model].tag,
    audio: await blob.bytes()
  })
  return {
    model,
    segments: result.segments.map((s) => ({
      content: s.text,
      timestamp: s.startSecond * 1000,
      durationMillis: (s.endSecond - s.startSecond) * 1000
    })),
    language: result.language,
    audioDurationMillis: (result.durationInSeconds ?? 0) * 1000
  }
}
