import { useTranscriptionDeletion } from "@/lib/client/api"
import { SavedTranscription } from "@/lib/transcription"

export type TranscriptionCardProps = {
  transcription: SavedTranscription
}

export function TranscriptionCard({ transcription }: TranscriptionCardProps) {
  const deletion = useTranscriptionDeletion(transcription.id)
  return (
    <div
      className={`p-5 flex items-center justify-between ${deletion.isMutating ? "opacity-50" : ""}`}
    >
      <b>{transcription.filename}</b>
      <button
        disabled={deletion.isMutating}
        onClick={async () => await deletion.trigger()}
      >
        Delete
      </button>
    </div>
  )
}
