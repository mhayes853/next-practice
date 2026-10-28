import { useTranscriptionDeletion } from "@/lib/client/api"
import { SavedTranscription } from "@/lib/transcription"
import Link from "next/link"
import { transcriptionLabel } from "@/lib/client/transcription"
import { TranscriptionMenu } from "./TranscriptionMenu"

export type TranscriptionCardProps = {
  transcription: SavedTranscription
}

export function TranscriptionCard({ transcription }: TranscriptionCardProps) {
  const deletion = useTranscriptionDeletion(transcription.id)
  return (
    <div
      className={`p-5 rounded-2xl flex items-center justify-between ${deletion.isMutating ? "opacity-50" : ""} bg-[#1c1e21]`}
    >
      <div>
        <Link
          href={`/transcriptions/${transcription.id}`}
          className="hover:underline"
        >
          <b>{transcription.filename}</b>
        </Link>
        <p className="text-sm opacity-75">
          {transcriptionLabel(transcription)}
        </p>
      </div>
      <TranscriptionMenu id={transcription.id} />
    </div>
  )
}
