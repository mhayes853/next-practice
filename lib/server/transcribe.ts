import { transcribe } from "ai"
import {
  TranscriptionModelID,
  Transcription,
  TRANSCRIPTION_MODELS,
  TranscriptionID
} from "../transcription"
import { readFile } from "node:fs/promises"
import { DatabaseConnection } from "@/prisma/db"
import { UserID } from "../user"

export type TranscribableFile = {
  filename: string
  filepath: string
}

export async function transcribeFile(
  file: TranscribableFile,
  model: TranscriptionModelID
): Promise<Transcription> {
  const result = await transcribe({
    model: TRANSCRIPTION_MODELS[model].tag,
    audio: await readFile(file.filepath)
  })
  return {
    filename: file.filename,
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

export async function saveTranscriptions(
  db: DatabaseConnection,
  userId: UserID,
  transcriptions: Transcription[]
) {
  const savedTranscriptions = await Promise.all(
    transcriptions.map(async (t) => {
      const { id } = await db.orm.public.Transcript.select("id").create({
        userId,
        filename: t.filename,
        audioDurationMillis: t.audioDurationMillis,
        language: t.language,
        model: t.model
      })
      return [id as TranscriptionID, t] as const
    })
  )

  await db.orm.public.TranscriptPart.createAll(
    savedTranscriptions.flatMap(([id, t]) => {
      return t.segments.map((s) => ({
        transcriptId: id,
        timestamp: s.timestamp,
        durationMillis: s.durationMillis,
        content: s.content
      }))
    })
  )
  return savedTranscriptions
}
