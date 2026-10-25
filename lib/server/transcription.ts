import { transcribe } from "ai"
import {
  TranscriptionModelID,
  Transcription,
  TRANSCRIPTION_MODELS,
  SavedTranscription,
  TranscriptionID,
  TranscriptsCursor
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
    language: result.language,
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

export async function transcriptWithId(
  db: DatabaseConnection,
  id: TranscriptionID
): Promise<SavedTranscription | null> {
  const transcription = await db.orm.public.Transcript.include("parts")
    .where({ id })
    .first()
  if (!transcription) return null
  return savedTranscription(transcription)
}

export async function deleteTranscriptById(
  db: DatabaseConnection,
  id: TranscriptionID,
  userId: UserID
) {
  const tid = await db.orm.public.Transcript.where({ id, userId })
    .select("id")
    .delete()
  return tid !== null
}

export type UserTranscriptsPage = {
  transcripts: SavedTranscription[]
  nextCursor?: TranscriptsCursor
}

export async function userTranscripts(
  db: DatabaseConnection,
  userId: UserID,
  limit: number,
  cursor?: TranscriptsCursor
): Promise<UserTranscriptsPage> {
  const transcripts = (
    await db.orm.public.Transcript.include("parts", (p) =>
      p.orderBy((p) => p.id.asc())
    )
      .where({ userId })
      .where((t) => t.id.gte(cursor?.id ?? -1))
      .orderBy((t) => t.id.asc())
      .limit(limit + 1)
      .all()
  ).map(savedTranscription)

  if (transcripts.length < limit + 1) {
    return { transcripts }
  } else {
    const lastId = transcripts.pop()?.id ?? -1
    return { transcripts, nextCursor: { id: lastId } }
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
