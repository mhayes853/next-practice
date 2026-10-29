import { formattedDuration } from "../duration-components"
import { SavedTranscription, TranscriptionSegment } from "../transcription"
import { compactMap, occurences } from "../utils"

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

export type SearchedTranscriptionSegment = TranscriptionSegment & {
  highlightRegions: { start: number; end: number }[]
}

export function searchSegments(
  segments: TranscriptionSegment[],
  query: string
): SearchedTranscriptionSegment[] {
  return compactMap(segments, (segment) => {
    const highlightRegions = occurences(
      segment.content.toLowerCase(),
      query.toLowerCase()
    )
    if (highlightRegions.length === 0) return null
    return { ...segment, highlightRegions }
  })
}
