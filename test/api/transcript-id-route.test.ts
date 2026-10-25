// @vitest-environment node
import "next-test-api-route-handler"
import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/prisma/db"
import { saveTranscription } from "@/lib/server/transcription"
import type { Transcription } from "@/lib/transcription"
import type { Session } from "next-auth"
import type { UserID } from "@/lib/user"
import { createTranscriptByIdHandler } from "@/pages/api/transcript/[id]"
import { callApiRoute } from "@/test/api-route"

const TEST_TRANSCRIPTION: Transcription = {
  filename: "item.wav",
  model: "transcribe1",
  language: "en",
  audioDurationMillis: 1250,
  segments: [{ content: "saved transcript", timestamp: 0, durationMillis: 1250 }]
}

let activeSession: Session | null = null
const handler = createTranscriptByIdHandler({ resolveSession: async () => activeSession })
const pagesHandler = { default: handler }

describe("/api/transcript/[id]", () => {
  let ownerId: UserID
  let transcriptId: number

  beforeEach(async () => {
    const owner = await db.orm.public.User.create({
      name: "Transcript item owner",
      email: "transcript-item-owner@example.test"
    })
    ownerId = owner.id as UserID
    const transcript = await saveTranscription(db, ownerId, TEST_TRANSCRIPTION)
    transcriptId = transcript.id
    activeSession = {
      user: { id: ownerId },
      expires: new Date(Date.now() + 60_000).toISOString()
    } satisfies Session
  })

  it("returns the transcript and its parts", async () => {
    const response = await callApiRoute(pagesHandler, { method: "GET", path: `/api/transcript/${transcriptId}` })

    expect(response.status).toBe(200)
    expect(JSON.parse(response.body)).toMatchObject({
      id: transcriptId,
      userId: ownerId,
      filename: TEST_TRANSCRIPTION.filename,
      segments: TEST_TRANSCRIPTION.segments
    })
  })

  it("returns 400 for an invalid id and 404 for a missing transcript", async () => {
    const invalid = await callApiRoute(pagesHandler, { method: "GET", path: "/api/transcript/not-a-number" })
    const missing = await callApiRoute(pagesHandler, { method: "GET", path: "/api/transcript/999999999" })

    expect(invalid.status).toBe(400)
    expect(missing.status).toBe(404)
  })

  it("prevents another signed-in user from reading or deleting the transcript", async () => {
    const other = await db.orm.public.User.create({
      name: "Other transcript user",
      email: "transcript-item-other@example.test"
    })
    activeSession = {
      user: { id: other.id },
      expires: new Date(Date.now() + 60_000).toISOString()
    } satisfies Session

    const get = await callApiRoute(pagesHandler, { method: "GET", path: `/api/transcript/${transcriptId}` })
    const del = await callApiRoute(pagesHandler, { method: "DELETE", path: `/api/transcript/${transcriptId}` })

    expect(get.status).toBe(403)
    expect(del.status).toBe(403)
    expect(await db.orm.public.Transcript.where({ id: transcriptId }).all()).toHaveLength(1)
  })

  it("deletes the transcript and its parts", async () => {
    const response = await callApiRoute(pagesHandler, { method: "DELETE", path: `/api/transcript/${transcriptId}` })

    expect(response.status).toBe(204)
    expect(await db.orm.public.Transcript.where({ id: transcriptId }).all()).toHaveLength(0)
    expect(await db.orm.public.TranscriptPart.where({ transcriptId }).all()).toHaveLength(0)
  })

  it("returns 404 when deleting a transcript that does not exist", async () => {
    const response = await callApiRoute(pagesHandler, { method: "DELETE", path: "/api/transcript/999999999" })

    expect(response.status).toBe(404)
  })

  it("rejects unsupported methods", async () => {
    const response = await callApiRoute(pagesHandler, { method: "POST", path: `/api/transcript/${transcriptId}` })

    expect(response.status).toBe(405)
  })
})
