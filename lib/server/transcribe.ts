import { transcribe } from "ai"
import {
  TranscriptionModelID,
  Transcription,
  TRANSCRIPTION_MODELS,
  SavedTranscription,
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

export async function saveTranscription(
  db: DatabaseConnection,
  userId: UserID,
  transcription: Transcription
): Promise<SavedTranscription> {
  const { id } = await db.orm.public.Transcript.select("id").create({
    userId,
    filename: transcription.filename,
    audioDurationMillis: transcription.audioDurationMillis,
    language: transcription.language,
    model: transcription.model
  })
  await db.orm.public.TranscriptPart.createAll(
    transcription.segments.map((s) => ({
      transcriptId: id,
      timestamp: s.timestamp,
      durationMillis: s.durationMillis,
      content: s.content
    }))
  )
  return { ...transcription, id: id as TranscriptionID }
}
