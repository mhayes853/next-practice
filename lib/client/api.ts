import useSWR, { ScopedMutator, useSWRConfig } from "swr"
import {
  DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT,
  SavedTranscription,
  SavedTranscriptionSchema,
  TranscriptionID,
  TranscriptionModelID,
  TranscriptionsPage,
  TranscriptionsPageSchema
} from "../transcription"
import useSWRInfinite, { unstable_serialize } from "swr/infinite"
import { zodFetcher } from "./zod-fetcher"
import z from "zod"
import { useCallback, useEffect } from "react"
import useSWRMutation from "swr/mutation"
import { sleep } from "../utils"

const ERROR_RESPONSES = {
  404: z.object({ error: z.literal("not found") }),
  405: z.object({ error: z.literal("invalid method") }),
  403: z.object({ error: z.literal("forbidden") }),
  400: z.object({ error: z.literal("bad request") })
} as const

const transcriptionsPageFetcher = zodFetcher({
  200: TranscriptionsPageSchema,
  ...ERROR_RESPONSES
})

function userTranscriptionsKey(
  previous?: Awaited<ReturnType<typeof transcriptionsPageFetcher>>
) {
  const limit = DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT

  if (!previous) return `/api/transcript?limit=${limit}`
  if (previous.status !== 200 || !previous.data.nextCursor) return null
  return `/api/transcript?limit=${limit}&cursor=${previous.data.nextCursor}`
}

export function useUserTranscriptions(initialPage?: TranscriptionsPage) {
  const { mutate } = useSWRConfig()
  const result = useSWRInfinite(
    useCallback((_, previous) => userTranscriptionsKey(previous), []),
    transcriptionsPageFetcher,
    {
      revalidateAll: true,
      fallbackData: initialPage
        ? [{ status: 200, data: initialPage }]
        : undefined
    }
  )

  useEffect(() => {
    if (!result.data) return
    result.data.forEach((page) => {
      if (page.status !== 200) return
      page.data.transcriptions.forEach((transcription) => {
        mutate(
          transcriptionKey(transcription.id),
          { status: 200, data: transcription },
          { revalidate: false }
        )
      })
    })
  }, [result.data, mutate])

  return result
}

function transcriptionKey(id: TranscriptionID) {
  return `/api/transcript/${id}`
}

const transcriptionFetcher = zodFetcher({
  200: SavedTranscriptionSchema,
  ...ERROR_RESPONSES
})

export function useTranscription(value: TranscriptionID | SavedTranscription) {
  return useSWR(
    transcriptionKey(typeof value === "number" ? value : value.id),
    transcriptionFetcher,
    {
      fallbackData:
        typeof value === "number" ? undefined : { status: 200, data: value }
    }
  )
}

export type UseTranscribeArgs = {
  onSuccess?: (result: SavedTranscription) => void
}

export function useTranscribe({ onSuccess }: UseTranscribeArgs = {}) {
  const { mutate } = useSWRConfig()
  return useSWRMutation(
    "/api/transcript",
    async (
      url,
      { arg }: { arg: { modelId: TranscriptionModelID; file: File } }
    ) => {
      const formData = new FormData()
      formData.set("model", arg.modelId)
      formData.set("attachments", arg.file)

      const response = await fetch(url, { method: "POST", body: formData })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`)
      }

      if (response.status !== 201) {
        throw new Error(`Unexpected status: ${response.status}`)
      }

      return await SavedTranscriptionSchema.parseAsync(await response.json())
    },
    {
      populateCache: false,
      revalidate: false,
      onSuccess: async (result) => {
        await mutate(
          transcriptionKey(result.id),
          { status: 200, data: result },
          { revalidate: false }
        )
        invalidateTranscriptions(mutate)
        onSuccess?.(result)
      }
    }
  )
}

export function useTranscriptionDeletion(id: TranscriptionID) {
  const { mutate } = useSWRConfig()
  return useSWRMutation(
    transcriptionKey(id),
    async () => {
      const response = await fetch(`/api/transcript/${id}`, {
        method: "DELETE"
      })
      if (response.status !== 204) {
        throw new Error(`Unexpected status: ${response.status}`)
      }
    },
    { onSuccess: () => invalidateTranscriptions(mutate) }
  )
}

function invalidateTranscriptions(mutate: ScopedMutator) {
  mutate(unstable_serialize((_, prev) => userTranscriptionsKey(prev)))
}
