import { authenticatedHandler, type SessionResolver } from "@/lib/server/auth"
import { badRequest, invalidMethod } from "@/lib/server/invalid-requests"
import {
  saveTranscription,
  transcribeFile,
  userTranscripts
} from "@/lib/server/transcription"
import {
  TRANSCRIPTION_MODELS,
  TranscriptionModelID,
  SavedTranscription,
  decodeCursor,
  encodeCursor
} from "@/lib/transcription"
import { db } from "@/prisma/db"
import formidable from "formidable"
import { NextApiRequest, NextApiResponse } from "next"
import type { Session } from "next-auth"
import z from "zod"

export const config = {
  api: {
    bodyParser: false
  }
} as const

const TEN_MB = 10 * 1024 * 1024

async function post(
  req: NextApiRequest,
  res: NextApiResponse<SavedTranscription>,
  session: Session,
  transcribe: typeof transcribeFile
) {
  const form = formidable({ maxFileSize: TEN_MB })
  const [fields, files] = await form.parse(req)
  const file = files.attachments?.[0]
  const requestedModel = fields.model?.[0]

  if (
    typeof requestedModel !== "string" ||
    !Object.hasOwn(TRANSCRIPTION_MODELS, requestedModel) ||
    !file
  )
    return badRequest(res)

  const modelId = requestedModel as TranscriptionModelID
  const transcription = await transcribe(
    {
      filename: file.originalFilename ?? file.newFilename,
      filepath: file.filepath
    },
    modelId
  )

  const saved = await db.transaction(
    async (tx) => await saveTranscription(tx, session.user.id, transcription)
  )

  res.status(201).json(saved)
}

const GetQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .refine(Number.isSafeInteger),
  cursor: z
    .string()
    .transform((c) => decodeCursor(c))
    .optional()
})

async function get(
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session
) {
  const query = GetQuerySchema.safeParse(req.query)
  if (!query.success) return badRequest(res)

  const page = await userTranscripts(
    db,
    session.user.id,
    query.data.limit,
    query.data.cursor
  )
  res.status(200).json({
    ...page,
    nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null
  })
}

type HandlerDependencies = {
  transcribe?: typeof transcribeFile
  resolveSession?: SessionResolver
}

export function createTranscriptHandler({
  transcribe = transcribeFile,
  resolveSession
}: HandlerDependencies = {}) {
  return authenticatedHandler(async (req, res, session) => {
    if (req.method === "POST") {
      await post(req, res, session, transcribe)
    } else if (req.method === "GET") {
      await get(req, res, session)
    } else {
      invalidMethod(res)
    }
  }, resolveSession)
}

export default createTranscriptHandler()
