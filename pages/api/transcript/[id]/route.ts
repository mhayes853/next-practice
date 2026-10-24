import { authenticatedHandler } from "@/lib/server/auth"
import {
  badRequest,
  forbidden,
  invalidMethod,
  notFound
} from "@/lib/server/invalid-requests"
import { transcriptWithId } from "@/lib/server/transcribe"
import { SavedTranscription, TranscriptionID } from "@/lib/transcription"
import { db } from "@/prisma/db"

export default authenticatedHandler<SavedTranscription>(
  async (req, res, session) => {
    if (req.method !== "GET") return invalidMethod(res)

    const { id } = req.query
    if (typeof id !== "string") return badRequest(res)

    const transcript = await transcriptWithId(
      db,
      parseInt(id) as TranscriptionID
    )
    if (!transcript) return notFound(res)
    if (session.user.id !== transcript.userId) return forbidden(res)

    res.status(200).json(transcript)
  }
)
