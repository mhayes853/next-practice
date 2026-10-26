import useSWR, { useSWRConfig } from "swr"
import {
  DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT,
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
  limit: number,
  previous?: Awaited<ReturnType<typeof transcriptionsPageFetcher>>
) {
  if (!previous) return `/api/transcript?limit=${limit}`
  if (previous.status !== 200 || !previous.data.nextCursor) return null
  return `/api/transcript?limit=${limit}&cursor=${previous.data.nextCursor}`
}

export function useUserTranscriptions(
  initialPage?: TranscriptionsPage,
  limit: number = DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT
) {
  const { mutate } = useSWRConfig()
  const result = useSWRInfinite(
    useCallback(
      (_, previous) => userTranscriptionsKey(limit, previous),
      [limit]
    ),
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

export function useTranscription(id: TranscriptionID) {
  return useSWR(transcriptionKey(id), transcriptionFetcher)
}

export function useTranscribe(
  modelId: TranscriptionModelID,
  file: File,
  userLimit: number = DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT
) {
  const { mutate } = useSWRConfig()
  return useCallback(async () => {
    const formData = new FormData()
    formData.set("model", modelId)
    formData.set("attachments", file)

    const response = await fetch("/api/transcript", {
      method: "POST",
      body: formData
    })
    if (response.status !== 201) return
    const result = await SavedTranscriptionSchema.parseAsync(
      await response.json()
    )

    mutate(
      transcriptionKey(result.id),
      { status: 200, data: result },
      { revalidate: false }
    )
    mutate(
      unstable_serialize((_, prev) => userTranscriptionsKey(userLimit, prev))
    )
    return result
  }, [modelId, file, mutate, userLimit])
}

export function useTranscriptionDeletion(
  id: TranscriptionID,
  userLimit: number = DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT
) {
  const { mutate } = useSWRConfig()
  return useCallback(async () => {
    const response = await fetch(`/api/transcript/${id}`, { method: "DELETE" })
    if (response.status !== 204) return
    mutate(transcriptionKey(id))
    mutate(
      unstable_serialize((_, prev) => userTranscriptionsKey(userLimit, prev))
    )
  }, [id, mutate, userLimit])
}
