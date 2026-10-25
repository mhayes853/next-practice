import { authenticatedHandler } from "@/lib/server/auth"
import { badRequest, invalidMethod } from "@/lib/server/invalid-requests"
import { saveTranscription, transcribeFile } from "@/lib/server/transcription"
import { TranscriptionModelID, SavedTranscription } from "@/lib/transcription"
import { db } from "@/prisma/db"
import formidable from "formidable"
import { NextApiRequest, NextApiResponse } from "next"
import { Session } from "next-auth"

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

async function get(
  req: NextApiRequest,
  res: NextApiResponse<SavedTranscription>,
  session: Session
) {}

export default authenticatedHandler(async (req, res, session) => {
  if (req.method === "POST") {
    await post(req, res, session)
  } else if (req.method === "GET") {
    await get(req, res, session)
  } else {
    invalidMethod(res)
  }
})
