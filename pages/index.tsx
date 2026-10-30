import { Button } from "@/components/Button"
import { Plus } from "@/components/Icons"
import { Modal } from "@/components/Modal"
import { Spinner } from "@/components/Spinner"
import { TranscriptionCard } from "@/components/TranscriptionCard"
import { UploadForm } from "@/components/UploadForm"
import { useUserTranscriptions } from "@/lib/client/api"
import { useStoredValue } from "@/lib/client/use-stored-value"
import { authenticatedGetServerSideProps } from "@/lib/server/auth"
import { userTranscriptions } from "@/lib/server/transcription"
import {
  DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT,
  deserialize,
  serialize,
  SerializeableTranscription,
  TranscriptionsPage
} from "@/lib/transcription"
import { db } from "@/prisma/db"
import { Session } from "next-auth"
import { signOut } from "next-auth/react"
import { useCallback, useRef, useState } from "react"

export type HomeProps = {
  session: Session
  initialPage: Omit<TranscriptionsPage, "transcriptions"> & {
    transcriptions: SerializeableTranscription[]
  }
}

export const getServerSideProps = authenticatedGetServerSideProps(
  async (context) => {
    const page = await userTranscriptions(
      db,
      context.session.user.id,
      DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT,
      null
    )
    if (page === "invalid-cursor") {
      return {
        props: {
          session: context.session,
          initialPage: { transcriptions: [] as SerializeableTranscription[] }
        }
      }
    }
    return {
      props: {
        session: context.session,
        initialPage: {
          ...page,
          transcriptions: page.transcriptions.map(serialize)
        }
      }
    }
  }
)

type TranscriptionsLayout = "grid" | "list"

const TRANSCRIPTIONS_LAYOUT_KEY = "transcriptions-layout"

export default function Home({ session, initialPage }: HomeProps) {
  const deserializedInitialPage = initialPage
    ? {
        ...initialPage,
        transcriptions: initialPage.transcriptions.map(deserialize)
      }
    : undefined
  const transcriptions = useUserTranscriptions(deserializedInitialPage)
  const [isPresentingUpload, setIsPresentingUpload] = useState(false)
  const observer = useRef<IntersectionObserver | undefined>(undefined)
  const [layout, setLayout] = useStoredValue<TranscriptionsLayout>(
    TRANSCRIPTIONS_LAYOUT_KEY,
    "grid"
  )

  const bottomRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) transcriptions.setSize((s) => s + 1)
        })
      })

      if (node) observer.current.observe(node)
    },
    [transcriptions]
  )

  const hasTranscriptions =
    transcriptions.data &&
    transcriptions.data[0].status === 200 &&
    transcriptions.data[0].data.transcriptions.length > 0

  return (
    <div className="flex flex-col">
      <b className="text-3xl">Welcome, {session.user.name}</b>
      <div className="flex flex-row gap-4 items-center mt-4">
        <Button onClick={() => setIsPresentingUpload(true)}>
          <div className="flex flex-row gap-2 items-center">
            <Plus /> New Transcription
          </div>
        </Button>
        <Button kind="danger" onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>
      <div className="flex flex-col gap-4 pt-16">
        <div className="flex flex-row justify-between items-center">
          <b className={`text-xl ${hasTranscriptions ? "pl-4" : ""}`}>
            Transcriptions
          </b>
          <div className="flex flex-row gap-4">
            <p
              className={`cursor-pointer ${layout === "grid" ? "font-bold" : ""}`}
              onClick={() => setLayout("grid")}
            >
              Grid
            </p>
            <p
              className={`cursor-pointer ${layout === "list" ? "font-bold" : ""}`}
              onClick={() => setLayout("list")}
            >
              List
            </p>
          </div>
        </div>
        {transcriptions.isLoading && <Spinner />}
        <div
          className={`${layout === "grid" ? "grid grid-cols-2 gap-4" : "flex flex-col"} gap-4`}
        >
          {hasTranscriptions ? (
            transcriptions.data?.map((page) => {
              if (page.status !== 200) return null
              return page.data.transcriptions.map((t) => (
                <TranscriptionCard key={t.id} transcription={t} />
              ))
            })
          ) : (
            <p>No transcriptions yet.</p>
          )}
        </div>
        {hasNextPage(transcriptions) && (
          <div ref={bottomRef}>
            <Spinner />
          </div>
        )}
      </div>
      <Modal
        isOpen={isPresentingUpload}
        onClose={() => setIsPresentingUpload(false)}
      >
        <UploadForm />
      </Modal>
    </div>
  )
}

function hasNextPage(
  transcriptions: ReturnType<typeof useUserTranscriptions>
): boolean {
  if (transcriptions.error) return false
  if (!transcriptions.data || transcriptions.data.length === 0) return true
  const last = transcriptions.data[transcriptions.data.length - 1]
  return last.status === 200 && last.data.nextCursor !== null
}
