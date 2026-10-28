import { formattedDuration } from "../duration-components"
import { SavedTranscription } from "../transcription"

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
  return `${language} (${formattedDuration(transcription.audioDurationMillis)})`
}
