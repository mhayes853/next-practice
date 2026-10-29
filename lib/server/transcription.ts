import { transcribe } from "ai"
import {
  TranscriptionModelID,
  Transcription,
  TRANSCRIPTION_MODELS,
  SavedTranscription,
  TranscriptionID,
  TranscriptionsPage,
  decodeCursor,
  encodeCursor
} from "../transcription"
import { readFile } from "node:fs/promises"
import { DatabaseConnection } from "@/prisma/db"
import { UserID } from "../user"
import { Models } from "@/prisma/contract"

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
    language: result.language ?? null,
    audioDurationMillis: (result.durationInSeconds ?? 0) * 1000
  }
}

export async function saveTranscription(
  db: DatabaseConnection,
  userId: UserID,
  transcription: Transcription
): Promise<SavedTranscription> {
  const saved = await db.orm.public.Transcript.create({
    userId,
    filename: transcription.filename,
    audioDurationMillis: transcription.audioDurationMillis,
    language: transcription.language,
    model: transcription.model
  })
  const parts = await db.orm.public.TranscriptPart.createAll(
    transcription.segments.map((s) => ({
      transcriptId: saved.id,
      timestamp: s.timestamp,
      durationMillis: s.durationMillis,
      content: s.content
    }))
  )
  return savedTranscription({ ...saved, parts })
}

export async function transcriptionWithId(
  db: DatabaseConnection,
  id: TranscriptionID
): Promise<SavedTranscription | null> {
  const transcription = await db.orm.public.Transcript.include("parts")
    .where({ id })
    .first()
  if (!transcription) return null
  return savedTranscription(transcription)
}

export async function deleteTranscriptionById(
  db: DatabaseConnection,
  id: TranscriptionID
) {
  await db.orm.public.Transcript.where({ id }).deleteAndCount()
}

export async function userTranscriptions(
  db: DatabaseConnection,
  userId: UserID,
  limit: number,
  cursor: string | null
): Promise<TranscriptionsPage | "invalid-cursor"> {
  const decodedCursor = cursor ? decodeCursor(cursor) : null
  if (decodedCursor === undefined) return "invalid-cursor"
  let query = db.orm.public.Transcript.include("parts", (p) =>
    p.orderBy((p) => p.id.asc())
  ).where({ userId })
  if (decodedCursor) {
    query = query.where((t) => t.id.lte(decodedCursor.id))
  }
  const transcriptions = (
    await query
      .orderBy((t) => t.id.desc())
      .limit(limit + 1)
      .all()
  ).map(savedTranscription)

  if (transcriptions.length < limit + 1) {
    return { transcriptions, nextCursor: null }
  } else {
    const lastId = transcriptions.pop()?.id ?? -1
    return { transcriptions, nextCursor: encodeCursor({ id: lastId }) }
  }
}

function savedTranscription(
  transcription: Omit<Models.public_Transcript, "user" | "parts"> & {
    parts: Omit<Models.public_TranscriptPart, "transcript">[]
  }
) {
  return {
    id: transcription.id as TranscriptionID,
    createdAt: new Date(transcription.createdAt),
    updatedAt: new Date(transcription.updatedAt),
    audioDurationMillis: transcription.audioDurationMillis,
    language: transcription.language,
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
