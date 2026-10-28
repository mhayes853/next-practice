import { Divider } from "@/components/Divider"
import { Spinner } from "@/components/Spinner"
import { TranscriptionSegmentRow } from "@/components/TranscriptionSegmentRow"
import { useTranscription } from "@/lib/client/api"
import { transcriptionLabel } from "@/lib/client/transcription"
import { authenticatedGetServerSideProps } from "@/lib/server/auth"
import { transcriptionWithId } from "@/lib/server/transcription"
import {
  deserialize,
  SavedTranscription,
  serialize,
  SerializeableTranscription
} from "@/lib/transcription"
import { db } from "@/prisma/db"
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
  if (transcription.isLoading) return <Spinner />
  return transcription.data && transcription.data.status === 200 ? (
    <TranscriptionDetail transcription={transcription.data.data} />
  ) : (
    <b className="text-red-500">An error occurred.</b>
  )
}

type TranscriptionDetailProps = {
  transcription: SavedTranscription
}

function TranscriptionDetail({ transcription }: TranscriptionDetailProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col">
        <b className="text-2xl">{transcription.filename}</b>
        <p className="text-lg">{transcriptionLabel(transcription)}</p>
      </div>
      <Divider />

      <div className="flex flex-col gap-4">
        <b className="text-xl">Segments</b>
        {transcription.segments.length > 0 ? (
          <div className="flex flex-col gap-2">
            {transcription.segments.map((segment, i) => (
              <TranscriptionSegmentRow key={i} segment={segment} />
            ))}
          </div>
        ) : (
          <p>No segments for this audio.</p>
        )}
      </div>
    </div>
  )
}
