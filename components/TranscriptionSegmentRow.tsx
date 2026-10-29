import { SearchedTranscriptionSegment } from "@/lib/client/transcription"
import { formattedDuration } from "@/lib/duration-components"

export type TranscriptionSegmentProps = {
  segment: SearchedTranscriptionSegment
}

function highlightContent(
  content: string,
  highlightRegions: { start: number; end: number }[]
): string {
  return highlightRegions.reduce((acc, { start, end }) => {
    return acc.replace(
      content.slice(start, end),
      `<mark>${content.slice(start, end)}</mark>`
    )
  }, content)
}

export function TranscriptionSegmentRow({
  segment
}: TranscriptionSegmentProps) {
  return (
    <div>
      <b>
        {formattedDuration(segment.timestamp)} -{" "}
        {formattedDuration(segment.timestamp + segment.durationMillis)}
      </b>
      <div
        dangerouslySetInnerHTML={{
          __html: highlightContent(segment.content, segment.highlightRegions)
        }}
      />
    </div>
  )
}
