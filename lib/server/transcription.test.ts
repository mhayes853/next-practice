import { describe, expect, it } from "vitest"
import { Transcription, TranscriptionsPage } from "../transcription"
import {
  deleteTranscriptionById,
  saveTranscription,
  transcriptionWithId,
  userTranscriptions
} from "./transcription"
import { db } from "@/prisma/db"

const TEST_TRANSCRIPTION = {
  filename: "blob.mp3",
  language: "en",
  model: "transcribe1",
  segments: [
    { timestamp: 0, durationMillis: 20_000, content: "Hello world" },
    { timestamp: 25_000, durationMillis: 2_000, content: "This is a test" }
  ],
  audioDurationMillis: 30_000
} as const satisfies Transcription

describe("transcription tests", () => {
  it("should save transcriptions with ids", async () => {
    const { id: userId } = await testUser()
    const saved = await saveTranscription(db, userId, TEST_TRANSCRIPTION)
    const stored = await transcriptionWithId(db, saved.id)

    expect(saved).toMatchObject({
      userId: userId,
      filename: TEST_TRANSCRIPTION.filename,
      model: TEST_TRANSCRIPTION.model,
      language: TEST_TRANSCRIPTION.language
    })
    expect(saved).toEqual(stored)

    const parts = await db.orm.public.TranscriptPart.where({
      transcriptId: saved.id
    }).all()
    expect(parts).toMatchObject(TEST_TRANSCRIPTION.segments)
  })

  it("should return user transcripts", async () => {
    const user = await testUser()
    const t1 = await saveTranscription(db, user.id, TEST_TRANSCRIPTION)
    const t2 = await saveTranscription(db, user.id, TEST_TRANSCRIPTION)

    const p1 = (await userTranscriptions(
      db,
      user.id,
      1,
      null
    )) as TranscriptionsPage
    const p2 = (await userTranscriptions(
      db,
      user.id,
      1,
      p1.nextCursor
    )) as TranscriptionsPage

    expect(p1.transcriptions).toEqual([t1])
    expect(p2.transcriptions).toEqual([t2])
    expect(p2.nextCursor).toBeNull()
  })

  it("should return an invalid cursor when the cursor is invalid", async () => {
    const user = await testUser()
    const t1 = await userTranscriptions(db, user.id, 1, "blob")
    expect(t1).toEqual("invalid-cursor")
  })

  it("should be able to delete a transcript for a user", async () => {
    const user = await testUser()
    const t1 = await saveTranscription(db, user.id, TEST_TRANSCRIPTION)
    const t2 = await saveTranscription(db, user.id, TEST_TRANSCRIPTION)
    await deleteTranscriptionById(db, t1.id)

    expect(await transcriptionWithId(db, t1.id)).toBeNull()
    expect(await transcriptionWithId(db, t2.id)).toEqual(t2)
  })
})

async function testUser() {
  return await db.orm.public.User.create({
    name: "Blob",
    email: "blob@blob.com"
  })
}
