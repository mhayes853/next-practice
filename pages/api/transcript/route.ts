import { authenticatedHandler } from "@/lib/server/auth"
import { badRequest, invalidMethod } from "@/lib/server/invalid-requests"
import { saveTranscriptions, transcribeFile } from "@/lib/server/transcribe"
import {
  TranscriptionID,
  Transcription,
  TranscriptionModelID
} from "@/lib/transcription"
import { compactMap } from "@/lib/utils"
import { db } from "@/prisma/db"
import formidable from "formidable"

export const config = {
  api: {
    bodyParser: false
  }
}

const TEN_MB = 10 * 1024 * 1024

export type TranscriptionResult =
  | { status: "error"; filename: string }
  | { status: "success"; id: TranscriptionID; transcription: Transcription }

export type TranscriptionResponse = {
  transcripts: TranscriptionResult[]
}

function filename(f: formidable.File) {
  return f.originalFilename ?? f.newFilename
}

export default authenticatedHandler<TranscriptionResponse>(
  async (req, res, session) => {
    if (req.method !== "POST") return invalidMethod(res)

    const form = formidable({ maxFileSize: TEN_MB })
    const [fields, formFiles] = await form.parse(req)
    const files = formFiles.attachments ?? []

    if (typeof fields.model?.[0] !== "string" || files.length === 0) {
      return badRequest(res)
    }

    const modelId = fields.model[0] as TranscriptionModelID
    const results = await Promise.allSettled(
      files.map(
        async (f) =>
          await transcribeFile(
            {
              filename: filename(f),
              filepath: f.filepath
            },
            modelId
          )
      )
    )

    const failedTranscripts = compactMap(results, (r, i) => {
      return r.status === "rejected"
        ? ({ status: "error", filename: filename(files[i]) } as const)
        : undefined
    })
    const transcriptionsToSave = compactMap(results, (r) => {
      return r.status === "fulfilled" ? r.value : undefined
    })

    if (transcriptionsToSave.length === 0) {
      return res.status(200).json({ transcripts: failedTranscripts })
    }

    const transcriptions = (
      await db.transaction(async (tx) => {
        return await saveTranscriptions(
          tx,
          session.user.id,
          transcriptionsToSave
        )
      })
    ).map(([id, t]) => ({ status: "success", id, transcription: t }) as const)

    res
      .status(201)
      .json({ transcripts: [...transcriptions, ...failedTranscripts] })
  }
)
