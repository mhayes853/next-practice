import { Spinner } from "@/components/Spinner"
import { useTranscription } from "@/lib/client/api"
import { authenticatedGetServerSideProps } from "@/lib/server/auth"
import { transcriptionWithId } from "@/lib/server/transcription"
import {
  deserialize,
  serialize,
  SerializeableTranscription,
  TranscriptionID
} from "@/lib/transcription"
import { db } from "@/prisma/db"
import { useRouter } from "next/router"
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
  return <Spinner />
}
