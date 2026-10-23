import type { NextApiRequest, NextApiResponse } from "next"
import formidable from "formidable"
import { Transcription, TranscriptionID } from "@/lib/transcription"

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
  res: NextApiResponse<TranscriptionResponse>
) {
  if (req.method !== "POST") return res.status(405).end()
  const form = formidable({ maxFileSize: TEN_MB })
  const [_, files] = await form.parse(req)
}
