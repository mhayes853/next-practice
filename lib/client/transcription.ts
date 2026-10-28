import { SavedTranscription } from "../transcription"
import { durationComponents } from "../utils"

const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French"
}

export function transcriptionLabel(
  transcription: Pick<SavedTranscription, "language" | "audioDurationMillis">
) {
  const language = transcription.language
    ? (LANGUAGE_MAP[transcription.language] ?? transcription.language)
    : "Unknown"
  const { minutes, seconds } = durationComponents(
    transcription.audioDurationMillis
  )
  return `${language} (${minutes}:${seconds < 10 ? "0" : ""}${seconds})`
}
