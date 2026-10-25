import { authenticatedGetServerSideProps } from "@/lib/server/auth"
import { userTranscriptions } from "@/lib/server/transcription"
import { TranscriptionsPage } from "@/lib/transcription"
import { db } from "@/prisma/db"
import { Session } from "next-auth"

const LIMIT = 10

export type HomeProps = {
  session: Session
  initialPage: TranscriptionsPage
}

export const getServerSideProps = authenticatedGetServerSideProps(
  async (context) => {
    return {
      props: {
        session: context.session,
        initialPage: (await userTranscriptions(
          db,
          context.session.user.id,
          LIMIT,
          null
        )) as TranscriptionsPage // NB: Safe because null is always a valid cursor
      }
    }
  }
)

export default function Home({ session, initialPage }: HomeProps) {
  return (
    <main>
      <h1>Welcome, {session.user.name}</h1>
      <p>{initialPage.transcriptions.length} Transcripts</p>
    </main>
  )
}
