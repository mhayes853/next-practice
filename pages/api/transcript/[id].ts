import { authenticatedHandler, type SessionResolver } from "@/lib/server/auth"
import {
  badRequest,
  forbidden,
  invalidMethod,
  notFound
} from "@/lib/server/invalid-requests"
import {
  deleteTranscriptionById,
  transcriptionWithId
} from "@/lib/server/transcription"
import type { SavedTranscription } from "@/lib/transcription"
import { db } from "@/prisma/db"
import type { NextApiRequest, NextApiResponse } from "next"
import type { Session } from "next-auth"
import z from "zod"

const QuerySchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .transform((id) => Number(id))
})

async function get(
  req: NextApiRequest,
  res: NextApiResponse<SavedTranscription>,
  session: Session
) {
  const result = QuerySchema.safeParse(req.query)
  if (!result.success) return badRequest(res)

  const transcript = await transcriptionWithId(db, result.data.id)
  if (!transcript) return notFound(res)
  if (session.user.id !== transcript.userId) return forbidden(res)

  res.status(200).json(transcript)
}

async function del(
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session
) {
  const result = QuerySchema.safeParse(req.query)
  if (!result.success) return badRequest(res)

  await db.transaction(async (tx) => {
    const transcript = await transcriptionWithId(tx, result.data.id)
    if (!transcript) return notFound(res)
    if (session.user.id !== transcript.userId) return forbidden(res)

    await deleteTranscriptionById(tx, result.data.id)
    res.status(204).end()
  })
}

type HandlerDependencies = {
  resolveSession?: SessionResolver
}

export function createTranscriptByIdHandler({
  resolveSession
}: HandlerDependencies = {}) {
  return authenticatedHandler<SavedTranscription>(async (req, res, session) => {
    if (req.method === "GET") {
      await get(req, res, session)
    } else if (req.method === "DELETE") {
      await del(req, res, session)
    } else {
      invalidMethod(res)
    }
  }, resolveSession)
}

export default createTranscriptByIdHandler()
