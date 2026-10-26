import { useTranscribe } from "@/lib/client/api"
import { TRANSCRIPTION_MODELS, TranscriptionModelID } from "@/lib/transcription"
import { useState } from "react"
import { Button } from "./Button"

export function UploadForm() {
  const upload = useTranscribe()
  const [selectedModel, setSelectedModel] =
    useState<TranscriptionModelID>("whisper1")
  const [file, setFile] = useState<File | undefined>(undefined)

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
      <input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
      {upload.error && (
        <div className="text-red-500">{upload.error.message}</div>
      )}
      {file && (
        <Button
          disabled={upload.isMutating}
          onClick={() => upload.trigger({ modelId: selectedModel, file })}
        >
          Upload
        </Button>
      )}
    </div>
  )
}
