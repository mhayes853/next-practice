import { Button } from "@/components/Button"
import { TranscriptionCard } from "@/components/TranscriptionCard"
import { useUserTranscriptions } from "@/lib/client/api"
import { authenticatedGetServerSideProps } from "@/lib/server/auth"
import { userTranscriptions } from "@/lib/server/transcription"
import {
  DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT,
  TranscriptionsPage
} from "@/lib/transcription"
import { db } from "@/prisma/db"
import { Session } from "next-auth"
import { signOut } from "next-auth/react"

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
          DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT,
          null
        )) as TranscriptionsPage // NB: Safe because null is always a valid cursor
      }
    }
  }
)

export default function Home({ session, initialPage }: HomeProps) {
  const transcriptions = useUserTranscriptions(initialPage)

  if (transcriptions.isLoading) {
    return <div>Loading...</div>
  }

  return (
    <main className="h-screen w-screen">
      <div className="flex flex-col items-center justify-center ">
        <div className="w-180 mt-16">
          <b className="text-3xl">Welcome, {session.user.name}</b>
          <div className="flex flex-row gap-4 items-center mt-4">
            <Button onClick={() => {}}>+ New Transcription</Button>
            <Button kind="secondary" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
          {transcriptions.data?.map((page) => {
            if (page.status !== 200) return null
            return page.data.transcriptions.map((t) => (
              <TranscriptionCard key={t.id} transcription={t} />
            ))
          })}
        </div>
      </div>
    </main>
  )
}
