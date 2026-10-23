import { describe, expect, it } from "vitest"
import { Transcription } from "../transcription"
import { saveTranscriptions } from "./transcribe"
import { db } from "@/prisma/db"
import { userId } from "../user"

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
    const { id: uid } = await db.orm.public.User.create({
      name: "Blob",
      email: "blob@blob.com"
    })
    const [id, t] = (
      await saveTranscriptions(db, userId(uid), [transcription])
    )[0]

    expect(transcription).toEqual(t)

    const dbTranscription = await db.orm.public.Transcript.where({
      id
    }).firstOrThrow()

    expect(dbTranscription).toMatchObject({
      userId: userId(uid),
      id,
      filename: transcription.filename,
      model: transcription.model,
      language: transcription.language
    })

    const parts = await db.orm.public.TranscriptPart.where({
      transcriptId: id
    }).all()
    expect(parts).toMatchObject(transcription.segments)
  })
})
