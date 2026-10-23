import { TranscriptionID, Transcription } from "@/lib/transcription"
import { NextApiRequest, NextApiResponse } from "next"

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {}
