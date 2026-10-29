import { Divider } from "@/components/Divider"
import { Spinner } from "@/components/Spinner"
import { TranscriptionMenu } from "@/components/TranscriptionMenu"
import { TranscriptionSegmentRow } from "@/components/TranscriptionSegmentRow"
import { useTranscription } from "@/lib/client/api"
import { searchSegments, transcriptionLabel } from "@/lib/client/transcription"
import { useLastDefinedValue } from "@/lib/client/use-last-defined-value"
import { authenticatedGetServerSideProps } from "@/lib/server/auth"
import { transcriptionWithId } from "@/lib/server/transcription"
import {
  deserialize,
  SavedTranscription,
  serialize,
  SerializeableTranscription,
  TranscriptionSegment
} from "@/lib/transcription"
import { db } from "@/prisma/db"
import { useRouter } from "next/router"
import { useState } from "react"
import { z } from "zod"

const QuerySchema = z.object({
  id: z.string().pipe(z.coerce.number())
})

export type TranscriptionPageProps = {
  initialTranscription: SerializeableTranscription
}

export const getServerSideProps = authenticatedGetServerSideProps(
  async (context) => {
    const { id } = QuerySchema.parse(context.params)
    const transcription = await transcriptionWithId(db, id)
    if (!transcription) return { notFound: true }
    return { props: { initialTranscription: serialize(transcription) } }
  }
)

export default function TranscriptionPage({
  initialTranscription
}: TranscriptionPageProps) {
  const transcription = useTranscription(deserialize(initialTranscription))
  const transcriptionDetail = useLastDefinedValue(
    transcription.data && transcription.data.status === 200
      ? transcription.data.data
      : undefined
  )
  return transcriptionDetail ? (
    <TranscriptionDetail transcription={transcriptionDetail} />
  ) : transcription.isLoading ? (
    <Spinner />
  ) : (
    <b className="text-red-500">An error occurred.</b>
  )
}

type TranscriptionDetailProps = {
  transcription: SavedTranscription
}

function TranscriptionDetail({ transcription }: TranscriptionDetailProps) {
  const router = useRouter()
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-col">
          <b className="text-2xl">{transcription.filename}</b>
          <p className="text-lg">{transcriptionLabel(transcription)}</p>
        </div>
        <TranscriptionMenu
          id={transcription.id}
          onDeleteSuccess={() => router.replace("/")}
        />
      </div>
      <Divider />

      <SegmentsList segments={transcription.segments} />
    </div>
  )
}

type SegmentsListProps = {
  segments: TranscriptionSegment[]
}

function SegmentsList({ segments }: SegmentsListProps) {
  const [query, setQuery] = useState("")
  const searchedSegments = searchSegments(segments, query)
  return (
    <div className="flex flex-col gap-4">
      <b className="text-xl">Segments</b>
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 bg-[#23272e] p-4 rounded-xl"
      />
      {searchedSegments.length > 0 ? (
        <div className="flex flex-col gap-2">
          {searchedSegments.map((segment) => (
            <TranscriptionSegmentRow key={segment.id} segment={segment} />
          ))}
        </div>
      ) : (
        <p>No segments for this audio.</p>
      )}
    </div>
  )
}
