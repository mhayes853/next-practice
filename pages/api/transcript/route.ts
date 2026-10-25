import { authenticatedHandler } from "@/lib/server/auth"
import { badRequest, invalidMethod } from "@/lib/server/invalid-requests"
import {
  saveTranscription,
  transcribeFile,
  userTranscripts
} from "@/lib/server/transcription"
import {
  TranscriptionModelID,
  SavedTranscription,
  decodeCursor,
  encodeCursor
} from "@/lib/transcription"
import { db } from "@/prisma/db"
import formidable from "formidable"
import { NextApiRequest, NextApiResponse } from "next"
import { Session } from "next-auth"
import z from "zod"

export const config = {
  api: {
    bodyParser: false
  }
}

const TEN_MB = 10 * 1024 * 1024

async function post(
  req: NextApiRequest,
  res: NextApiResponse<SavedTranscription>,
  session: Session
) {
  const form = formidable({ maxFileSize: TEN_MB })
  const [fields, files] = await form.parse(req)
  const file = files.attachments?.[0]

  if (typeof fields.model?.[0] !== "string" || !file) return badRequest(res)

  const modelId = fields.model[0] as TranscriptionModelID
  const transcription = await transcribeFile(
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
    .transform((l) => parseInt(l))
    .refine((l) => l > 0),
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

export default authenticatedHandler(async (req, res, session) => {
  if (req.method === "POST") {
    await post(req, res, session)
  } else if (req.method === "GET") {
    await get(req, res, session)
  } else {
    invalidMethod(res)
  }
})
