import { authOptions } from "@/lib/server/auth"
import { userTranscripts } from "@/lib/server/transcription"
import { TranscriptionsPage } from "@/lib/transcription"
import { db } from "@/prisma/db"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { useSession } from "next-auth/react"

const LIMIT = 10

export type HomeProps = {
  initialPage: TranscriptionsPage
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async (
  context
) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session) {
    return { redirect: { permanent: true, destination: "/sign-in" } }
  }

  const initialPage = (await userTranscripts(
    db,
    session.user.id,
    LIMIT,
    null
  )) as TranscriptionsPage // NB: Safe because null is always a valid cursor
  return { props: { initialPage } }
}

export default function Home({ initialPage }: HomeProps) {
  const { data: session } = useSession()
  return (
    <main>
      <h1>Welcome, {session?.user?.name}</h1>
      <p>{initialPage.transcriptions.length} Transcripts</p>
    </main>
  )
}
