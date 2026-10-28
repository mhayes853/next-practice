import { formattedDuration } from "@/lib/duration-components"
import { TranscriptionSegment } from "@/lib/transcription"

export type TranscriptionSegmentProps = {
  segment: TranscriptionSegment
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
      <p>{segment.content}</p>
    </div>
  )
}
