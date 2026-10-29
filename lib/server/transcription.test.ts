import { describe, expect, it } from "vitest"
import { encodeCursor, Transcription, TranscriptionsPage } from "../transcription"
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

  it.each([1, 2, 3, 4])("returns user transcripts newest first with a page size of %i", async (limit) => {
    const user = await testUser()
    const t1 = await saveTranscription(db, user.id, TEST_TRANSCRIPTION)
    const t2 = await saveTranscription(db, user.id, TEST_TRANSCRIPTION)
    const t3 = await saveTranscription(db, user.id, TEST_TRANSCRIPTION)
    const expected = [t3, t2, t1]
    let cursor: string | null = null

    for (let offset = 0; offset < expected.length; offset += limit) {
      const page = (await userTranscriptions(
        db,
        user.id,
        limit,
        cursor
      )) as TranscriptionsPage
      const next = expected[offset + limit]

      expect(page.transcriptions).toEqual(expected.slice(offset, offset + limit))
      expect(page.nextCursor).toBe(next ? encodeCursor({ id: next.id }) : null)
      cursor = page.nextCursor
    }
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
