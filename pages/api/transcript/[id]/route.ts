import { authenticatedHandler } from "@/lib/server/auth"
import {
  badRequest,
  forbidden,
  invalidMethod,
  notFound
} from "@/lib/server/invalid-requests"
import {
  deleteTranscriptById,
  transcriptWithId
} from "@/lib/server/transcription"
import { SavedTranscription } from "@/lib/transcription"
import { db } from "@/prisma/db"
import { NextApiRequest, NextApiResponse } from "next"
import { Session } from "next-auth"
import z from "zod"

const QuerySchema = z.object({ id: z.string().transform((id) => parseInt(id)) })

async function get(
  req: NextApiRequest,
  res: NextApiResponse<SavedTranscription>,
  session: Session
) {
  const result = QuerySchema.safeParse(req.query)
  if (!result.success) return badRequest(res)

  const transcript = await transcriptWithId(db, result.data.id)
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
    const transcript = await transcriptWithId(tx, result.data.id)
    if (!transcript) return notFound(res)
    if (session.user.id !== transcript.userId) return forbidden(res)

    await deleteTranscriptById(tx, result.data.id)
    res.status(204)
  })
}

export default authenticatedHandler<SavedTranscription>(
  async (req, res, session) => {
    if (req.method === "GET") {
      get(req, res, session)
    } else if (req.method === "DELETE") {
      del(req, res, session)
    } else {
      invalidMethod(res)
    }
  }
)
