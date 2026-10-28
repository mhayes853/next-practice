import { useTranscribe } from "@/lib/client/api"
import { TRANSCRIPTION_MODELS, TranscriptionModelID } from "@/lib/transcription"
import { useEffect, useRef, useState } from "react"
import { Button } from "./Button"
import { useModal } from "./Modal"
import { Spinner } from "./Spinner"

export function UploadForm() {
  const { subscribe, close } = useModal()

  const upload = useTranscribe({ onSuccess: () => close() })
  const [selectedModel, setSelectedModel] =
    useState<TranscriptionModelID>("whisper1")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | undefined>(undefined)

  useEffect(() => {
    return subscribe((isOpen) => {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      upload.reset()
      if (!isOpen) setFile(undefined)
    })
  }, [subscribe, upload])

  return (
    <div className="flex flex-col gap-8">
      <b className="text-2xl">Upload Transcript</b>
      <select
        value={selectedModel}
        onChange={(e) =>
          setSelectedModel(e.target.value as TranscriptionModelID)
        }
      >
        {Object.keys(TRANSCRIPTION_MODELS).map((key) => (
          <option key={key} value={key}>
            {TRANSCRIPTION_MODELS[key as TranscriptionModelID].displayName}
          </option>
        ))}
      </select>
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*"
        onChange={(e) => setFile(e.target.files?.[0])}
      />
      {upload.error && (
        <div className="text-red-500">{upload.error.message}</div>
      )}
      {file && (
        <Button
          disabled={upload.isMutating}
          onClick={() => upload.trigger({ modelId: selectedModel, file })}
        >
          <div className="flex flex-row gap-4 items-center justify-center">
            {upload.isMutating && <Spinner />}
            Upload
          </div>
        </Button>
      )}
    </div>
  )
}
