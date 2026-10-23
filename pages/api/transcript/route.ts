import { authenticatedHandler } from "@/lib/server/auth"
import { TranscriptionID, Transcription } from "@/lib/transcription"

export const config = {
  api: {
    bodyParser: false
  }
}

const TEN_MB = 10 * 1024 * 1024

export type TranscriptionResponse = {
  transcripts: {
    id: TranscriptionID
    filename: string
    transcription: Transcription
  }
}

export default authenticatedHandler(async (req, res, session) => {})
