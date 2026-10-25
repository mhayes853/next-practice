// @vitest-environment node
import "next-test-api-route-handler"
import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/prisma/db"
import { saveTranscription } from "@/lib/server/transcription"
import type { Transcription } from "@/lib/transcription"
import type { Session } from "next-auth"
import type { UserID } from "@/lib/user"
import { config, createTranscriptHandler } from "@/pages/api/transcript"
import { callApiRoute } from "@/test/api-route"

const TEST_TRANSCRIPTION: Transcription = {
  filename: "sample.wav",
  model: "transcribe1",
  language: "en",
  audioDurationMillis: 1250,
  segments: [{ content: "mock transcript", timestamp: 0, durationMillis: 1250 }]
}

let activeSession: Session | null = null
const transcribeCalls: Array<
  Parameters<typeof import("@/lib/server/transcription").transcribeFile>
> = []
const handler = createTranscriptHandler({
  resolveSession: async () => activeSession,
  transcribe: async (...args) => {
    transcribeCalls.push(args)
    return TEST_TRANSCRIPTION
  }
})
const pagesHandler = { default: handler, config }

describe("/api/transcript", () => {
  let ownerId: UserID

  beforeEach(async () => {
    const user = await db.orm.public.User.create({
      name: "Transcript API owner",
      email: "transcript-api-owner@example.test"
    })
    ownerId = user.id as UserID
    activeSession = {
      user: { id: ownerId },
      expires: new Date(Date.now() + 60_000).toISOString()
    } satisfies Session
    transcribeCalls.length = 0
  })

  it("returns 401 when the caller is not signed in", async () => {
    activeSession = null

    const response = await callApiRoute(pagesHandler, { method: "GET", path: "/api/transcript?limit=10" })

    expect(response.status).toBe(401)
    expect(JSON.parse(response.body)).toEqual({ error: "unauthorized" })
  })

  it("rejects unsupported methods", async () => {
    const response = await callApiRoute(pagesHandler, { method: "PUT", path: "/api/transcript" })

    expect(response.status).toBe(405)
    expect(JSON.parse(response.body)).toEqual({ error: "invalid method" })
  })

  it("validates list query parameters", async () => {
    const response = await callApiRoute(pagesHandler, { method: "GET", path: "/api/transcript?limit=0" })
    const partiallyNumeric = await callApiRoute(pagesHandler, {
      method: "GET",
      path: "/api/transcript?limit=2invalid"
    })

    expect(response.status).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: "bad request" })
    expect(partiallyNumeric.status).toBe(400)
  })

  it("lists the signed-in user's transcripts with a cursor", async () => {
    const first = await saveTranscription(db, ownerId, {
      ...TEST_TRANSCRIPTION,
      filename: "first.wav"
    })
    const second = await saveTranscription(db, ownerId, {
      ...TEST_TRANSCRIPTION,
      filename: "second.wav"
    })
    const other = await db.orm.public.User.create({
      name: "Another owner",
      email: "transcript-api-other@example.test"
    })
    await saveTranscription(db, other.id as UserID, { ...TEST_TRANSCRIPTION, filename: "private.wav" })

    const response = await callApiRoute(pagesHandler, {
      method: "GET",
      path: "/api/transcript?limit=1"
    })
    const page = JSON.parse(response.body)

    expect(response.status).toBe(200)
    expect(page.transcripts).toHaveLength(1)
    expect(page.transcripts[0]).toMatchObject({
      id: first.id,
      filename: "first.wav",
      userId: ownerId
    })
    expect(page.nextCursor).toBe(Buffer.from(String(second.id)).toString("base64url"))
  })

  it("accepts multipart uploads, mocks transcription, and persists the result", async () => {
    const boundary = "api-test-boundary"
    const body = Buffer.from([
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ntranscribe1\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="attachments"; filename="sample.wav"\r\nContent-Type: audio/wav\r\n\r\nfake audio bytes\r\n`,
      `--${boundary}--\r\n`
    ].join(""))
    const response = await callApiRoute(pagesHandler, {
      method: "POST",
      path: "/api/transcript",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "content-length": String(body.length)
      },
      body
    })
    const saved = JSON.parse(response.body)

    expect(response.status).toBe(201)
    expect(transcribeCalls).toHaveLength(1)
    expect(transcribeCalls[0][0]).toMatchObject({ filename: "sample.wav", filepath: expect.any(String) })
    expect(transcribeCalls[0][1]).toBe("transcribe1")
    expect(saved).toMatchObject({
      filename: TEST_TRANSCRIPTION.filename,
      model: TEST_TRANSCRIPTION.model,
      userId: ownerId,
      segments: TEST_TRANSCRIPTION.segments
    })
    expect(await db.orm.public.TranscriptPart.where({ transcriptId: saved.id }).all()).toHaveLength(1)
  })

  it("rejects multipart uploads without a model or file", async () => {
    const boundary = "empty-form-boundary"
    const body = Buffer.from(`--${boundary}--\r\n`)
    const response = await callApiRoute(pagesHandler, {
      method: "POST",
      path: "/api/transcript",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "content-length": String(body.length)
      },
      body
    })

    expect(response.status).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: "bad request" })
    expect(transcribeCalls).toHaveLength(0)
  })

  it("rejects multipart uploads with an unsupported model", async () => {
    const boundary = "invalid-model-boundary"
    const body = Buffer.from([
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nunknown-model\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="attachments"; filename="sample.wav"\r\nContent-Type: audio/wav\r\n\r\nfake audio bytes\r\n`,
      `--${boundary}--\r\n`
    ].join(""))
    const response = await callApiRoute(pagesHandler, {
      method: "POST",
      path: "/api/transcript",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "content-length": String(body.length)
      },
      body
    })

    expect(response.status).toBe(400)
    expect(transcribeCalls).toHaveLength(0)
  })
})
