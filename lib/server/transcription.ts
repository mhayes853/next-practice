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
  const { id, createdAt, updatedAt } = await db.orm.public.Transcript.select(
    "id",
    "createdAt",
    "updatedAt"
  ).create({
    userId,
    filename: transcription.filename,
    audioDurationMillis: transcription.audioDurationMillis,
    language: transcription.language,
    model: transcription.model
  })
  const parts = await db.orm.public.TranscriptPart.createAll(
    transcription.segments.map((s) => ({
      transcriptId: id,
      timestamp: s.timestamp,
      durationMillis: s.durationMillis,
      content: s.content
    }))
  )
  return {
    ...transcription,
    id: id as TranscriptionID,
    userId,
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
    segments: parts.map((p) => ({
      id: p.id,
      content: p.content,
      durationMillis: p.durationMillis,
      timestamp: p.timestamp
    }))
  }
}

export async function transcriptWithId(
  db: DatabaseConnection,
  id: TranscriptionID
): Promise<SavedTranscription | null> {
  const transcription = await db.orm.public.Transcript.include("parts")
    .where({ id })
    .first()
  if (!transcription) return null
  return {
    id: transcription.id as TranscriptionID,
    createdAt: new Date(transcription.createdAt),
    updatedAt: new Date(transcription.updatedAt),
    audioDurationMillis: transcription.audioDurationMillis,
    language: transcription.language ?? undefined,
    filename: transcription.filename,
    model: transcription.model as TranscriptionModelID,
    userId: transcription.userId,
    segments: transcription.parts.map((p) => ({
      id: p.id,
      content: p.content,
      durationMillis: p.durationMillis,
      timestamp: p.timestamp
    }))
  }
}
