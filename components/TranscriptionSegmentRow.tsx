import { SearchedTranscriptionSegment } from "@/lib/client/transcription"
import { formattedDuration } from "@/lib/duration-components"
import { useMemo } from "react"

export type TranscriptionSegmentProps = {
  segment: SearchedTranscriptionSegment
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
      <HighlightContent
        content={segment.content}
        highlightRegions={segment.highlightRegions}
      />
    </div>
  )
}

type HighlightContentProps = {
  content: string
  highlightRegions: { start: number; end: number }[]
}

function HighlightContent({
  content,
  highlightRegions
}: HighlightContentProps) {
  const elements = useMemo(() => {
    let currentIndex = 0
    const results = highlightRegions.flatMap((r) => {
      const regularText = content.substring(currentIndex, r.start)
      const highlighted = <mark>{content.substring(r.start, r.end)}</mark>
      // eslint-disable-next-line react-hooks/immutability
      currentIndex = r.end
      return [regularText, highlighted]
    })

    if (currentIndex !== content.length - 1) {
      results.push(content.substring(currentIndex))
    }

    return results
  }, [content, highlightRegions])

  return <p>{elements}</p>
}
