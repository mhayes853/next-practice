import { describe, expect, it } from "vitest"
import { Transcription } from "../transcription"
import { saveTranscription, transcriptWithId } from "./transcribe"
import { db } from "@/prisma/db"

describe("transcribe tests", () => {
  it("should save transcriptions with ids", async () => {
    const transcription: Transcription = {
      filename: "blob.mp3",
      language: "en",
      model: "transcribe1",
      segments: [
        { timestamp: 0, durationMillis: 20_000, content: "Hello world" },
        { timestamp: 25_000, durationMillis: 2_000, content: "This is a test" }
      ],
      audioDurationMillis: 30_000
    }
    const { id: userId } = await db.orm.public.User.create({
      name: "Blob",
      email: "blob@blob.com"
    })
    const saved = await saveTranscription(db, userId, transcription)
    const stored = await transcriptWithId(db, saved.id)

    expect(saved).toMatchObject({
      userId: userId,
      filename: transcription.filename,
      model: transcription.model,
      language: transcription.language
    })
    expect(saved).toEqual(stored)

    const parts = await db.orm.public.TranscriptPart.where({
      transcriptId: saved.id
    }).all()
    expect(parts).toMatchObject(transcription.segments)
  })
})
