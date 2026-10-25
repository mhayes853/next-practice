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
import { SavedTranscription, TranscriptionID } from "@/lib/transcription"
import { db } from "@/prisma/db"
import { NextApiRequest, NextApiResponse } from "next"
import { Session } from "next-auth"

function transcriptId(req: NextApiRequest) {
  const { id } = req.query
  return typeof id === "string" ? (parseInt(id) as TranscriptionID) : undefined
}

async function get(
  req: NextApiRequest,
  res: NextApiResponse<SavedTranscription>,
  session: Session
) {
  const id = transcriptId(req)
  if (!id) return badRequest(res)

  const transcript = await transcriptWithId(db, id)
  if (!transcript) return notFound(res)
  if (session.user.id !== transcript.userId) return forbidden(res)

  res.status(200).json(transcript)
}

async function del(
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session
) {
  const id = transcriptId(req)
  if (!id) return badRequest(res)

  await db.transaction(async (tx) => {
    const transcript = await transcriptWithId(tx, id)
    if (!transcript) return notFound(res)
    if (session.user.id !== transcript.userId) return forbidden(res)

    await deleteTranscriptById(tx, id)
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
