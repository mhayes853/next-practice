import { useTranscriptionDeletion } from "@/lib/client/api"
import { SavedTranscription } from "@/lib/transcription"
import { Button, LabelButton } from "./Button"
import Link from "next/link"
import { Ellipsis, TrashCan } from "./Icons"
import { Modal } from "./Modal"
import { useState } from "react"
import { Spinner } from "./Spinner"
import { transcriptionLabel } from "@/lib/client/transcription"
import { Tooltip } from "./Tooltip"

export type TranscriptionCardProps = {
  transcription: SavedTranscription
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
        <p className="text-sm opacity-75">
          {transcriptionLabel(transcription)}
        </p>
      </div>
      {deletion.isMutating ? (
        <Spinner className="p-2" />
      ) : (
        <Tooltip
          menu={
            <LabelButton onClick={() => setIsShowingConfirmation(true)}>
              <div className="flex flex-row items-center gap-2 text-red-500">
                <TrashCan />
                <b>Delete</b>
              </div>
            </LabelButton>
          }
        >
          <Ellipsis />
        </Tooltip>
      )}
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
                setIsShowingConfirmation(false)
                await deletion.trigger()
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
