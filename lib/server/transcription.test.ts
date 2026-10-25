import { describe, expect, it } from "vitest"
import { Transcription } from "../transcription"
import {
  saveTranscription,
  transcriptWithId,
  userTranscripts
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
    const stored = await transcriptWithId(db, saved.id)

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

    const p1 = await userTranscripts(db, user.id, 1)
    const p2 = await userTranscripts(db, user.id, 1, p1.nextCursor)

    expect(p1.transcripts).toEqual([t1])
    expect(p2.transcripts).toEqual([t2])
    expect(p2.nextCursor).toBeUndefined()
  })
})

async function testUser() {
  return await db.orm.public.User.create({
    name: "Blob",
    email: "blob@blob.com"
  })
}
