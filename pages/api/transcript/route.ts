import { authenticatedHandler } from "@/lib/server/auth"
import { badRequest, invalidMethod } from "@/lib/server/invalid-requests"
import { saveTranscription, transcribeFile } from "@/lib/server/transcribe"
import { TranscriptionModelID, SavedTranscription } from "@/lib/transcription"
import { db } from "@/prisma/db"
import formidable from "formidable"

export const config = {
  api: {
    bodyParser: false
  }
}

const TEN_MB = 10 * 1024 * 1024

export default authenticatedHandler<SavedTranscription>(
  async (req, res, session) => {
    if (req.method !== "POST") return invalidMethod(res)

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
)
