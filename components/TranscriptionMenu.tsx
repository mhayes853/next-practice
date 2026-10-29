import { useTranscriptionDeletion } from "@/lib/client/api"
import { TranscriptionID } from "@/lib/transcription"
import { Spinner } from "./Spinner"
import { Button, LabelButton } from "./Button"
import { TrashCan, Ellipsis } from "./Icons"
import { Tooltip } from "./Tooltip"
import { useState } from "react"
import { Modal } from "./Modal"
import { useToastPresenter } from "./Toast"

export type TranscriptionMenuProps = {
  id: TranscriptionID
  onDeleteSuccess?: () => void
}

export function TranscriptionMenu({
  id,
  onDeleteSuccess
}: TranscriptionMenuProps) {
  const [isShowingConfirmation, setIsShowingConfirmation] = useState(false)
  const presenter = useToastPresenter()
  const deletion = useTranscriptionDeletion(id, {
    onSuccess: () => {
      onDeleteSuccess?.()
      presenter.present({
        message: "Transcription deleted successfully",
        type: "info"
      })
    }
  })
  return (
    <>
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
    </>
  )
}
