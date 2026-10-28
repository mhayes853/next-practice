import { useTranscriptionDeletion } from "@/lib/client/api"
import { SavedTranscription } from "@/lib/transcription"
import { Button } from "./Button"
import { durationComponents } from "@/lib/utils"
import Link from "next/link"
import { TrashCan } from "./Icons"
import { Modal } from "./Modal"
import { useState } from "react"

export type TranscriptionCardProps = {
  transcription: SavedTranscription
}

const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French"
}

function label(transcription: SavedTranscription) {
  const language = transcription.language
    ? (LANGUAGE_MAP[transcription.language] ?? transcription.language)
    : "Unknown"
  const { minutes, seconds } = durationComponents(
    transcription.audioDurationMillis
  )
  return `${language} (${minutes}:${seconds < 10 ? "0" : ""}${Math.floor(seconds)})`
}

export function TranscriptionCard({ transcription }: TranscriptionCardProps) {
  const [isShowingConfirmation, setIsShowingConfirmation] = useState(false)
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
        <p className="text-sm opacity-75">{label(transcription)}</p>
      </div>
      <Button
        kind="danger"
        disabled={deletion.isMutating}
        onClick={() => setIsShowingConfirmation(true)}
      >
        <div className="flex flex-row items-center gap-2">
          <TrashCan />
          Delete
        </div>
      </Button>
      <Modal
        isOpen={isShowingConfirmation}
        onClose={() => setIsShowingConfirmation(false)}
      >
        <div className="flex flex-col gap-10">
          <b className="text-xl">
            Are you sure you want to delete this transcription?
          </b>
          <div className="flex flex-row gap-4">
            <Button
              kind="danger"
              onClick={async () => {
                await deletion.trigger()
                setIsShowingConfirmation(false)
              }}
            >
              <div className="px-4">Yes</div>
            </Button>
            <Button
              kind="secondary"
              onClick={() => setIsShowingConfirmation(false)}
            >
              <div className="px-4">No</div>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
