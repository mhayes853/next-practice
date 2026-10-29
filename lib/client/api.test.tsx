import "@/test/setup.client"
import { act, renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import type { PropsWithChildren } from "react"
import { SWRConfig, type SWRConfiguration } from "swr"
import { describe, expect, it, vi } from "vitest"
import { server } from "@/test/msw"
import {
  DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT,
  type SavedTranscription,
  type TranscriptionsPage
} from "../transcription"
import {
  useTranscribe,
  useTranscription,
  useTranscriptionDeletion,
  useUserTranscriptions
} from "./api"

// Each test gets a real, isolated SWR cache shared by its separately mounted hooks.
// Spread hook results during render to subscribe to SWR's lazy data/error getters.
function createWrapper(config: SWRConfiguration = {}) {
  const cache = new Map()
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <SWRConfig
        value={{
          provider: () => cache,
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          revalidateIfStale: false,
          shouldRetryOnError: false,
          ...config
        }}
      >
        {children}
      </SWRConfig>
    )
  }
}

function transcription(
  id: number,
  filename = `recording-${id}.wav`
): SavedTranscription {
  return {
    id,
    userId: 1,
    filename,
    model: "whisper1",
    segments: [{ id: 0, content: "Hello", timestamp: 0, durationMillis: 1000 }],
    language: "en",
    audioDurationMillis: 1000,
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    updatedAt: new Date("2026-10-02T12:00:00.000Z")
  }
}

function page(...transcriptions: SavedTranscription[]): TranscriptionsPage {
  return { transcriptions, nextCursor: null }
}

function audioFile() {
  return new File(["audio bytes"], "sample.wav", { type: "audio/wav" })
}

describe("useUserTranscriptions", () => {
  it("fetches the default page and parses JSON timestamps into dates", async () => {
    const saved = transcription(1)
    const requests: string[] = []
    server.use(
      http.get("/api/transcript", ({ request }) => {
        requests.push(new URL(request.url).search)
        return HttpResponse.json(page(saved))
      })
    )

    const { result } = renderHook(() => ({ ...useUserTranscriptions() }), {
      wrapper: createWrapper()
    })

    await waitFor(() =>
      expect(result.current.data).toEqual([{ status: 200, data: page(saved) }])
    )
    expect(requests).toEqual([`?limit=${DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT}`])
    expect(result.current.error).toBeUndefined()
  })

  it("follows cursors with the default limit and stops at the last page", async () => {
    const first = transcription(1)
    const second = transcription(2)
    const requests: string[] = []
    server.use(
      http.get("/api/transcript", ({ request }) => {
        const url = new URL(request.url)
        requests.push(url.search)
        return HttpResponse.json(
          url.searchParams.has("cursor")
            ? page(second)
            : { ...page(first), nextCursor: "next-page" }
        )
      })
    )
    const { result } = renderHook(() => ({ ...useUserTranscriptions() }), {
      wrapper: createWrapper()
    })
    await waitFor(() => expect(result.current.data?.[0]?.status).toBe(200))

    await act(async () => {
      await result.current.setSize(2)
    })
    await waitFor(() =>
      expect(result.current.data).toEqual([
        { status: 200, data: { ...page(first), nextCursor: "next-page" } },
        { status: 200, data: page(second) }
      ])
    )
    expect(requests).toContain(
      `?limit=${DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT}&cursor=next-page`
    )

    await act(async () => {
      await result.current.setSize(3)
    })
    await waitFor(() => expect(result.current.isValidating).toBe(false))
    expect(result.current.data).toHaveLength(2)
    expect(
      requests.every(
        (query) =>
          query === `?limit=${DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT}` ||
          query ===
            `?limit=${DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT}&cursor=next-page`
      )
    ).toBe(true)
  })

  it("returns a handled API error and does not request another page", async () => {
    const requests: string[] = []
    server.use(
      http.get("/api/transcript", ({ request }) => {
        requests.push(request.url)
        return HttpResponse.json({ error: "bad request" }, { status: 400 })
      })
    )
    const { result } = renderHook(() => ({ ...useUserTranscriptions() }), {
      wrapper: createWrapper()
    })
    await waitFor(() =>
      expect(result.current.data).toEqual([
        { status: 400, data: { error: "bad request" } }
      ])
    )

    await act(async () => {
      await result.current.setSize(2)
    })
    await waitFor(() => expect(result.current.isValidating).toBe(false))
    expect(result.current.data).toHaveLength(1)
    // setSize may revalidate page one, but must never fetch a cursor page.
    expect(
      requests.every((url) => !new URL(url).searchParams.has("cursor"))
    ).toBe(true)
    expect(result.current.error).toBeUndefined()
  })

  it("seeds detail hooks from the initial page without fetching", async () => {
    const saved = transcription(1)
    const wrapper = createWrapper({ revalidateOnMount: false })
    const list = renderHook(() => ({ ...useUserTranscriptions(page(saved)) }), {
      wrapper
    })
    const detail = renderHook(() => ({ ...useTranscription(saved.id) }), {
      wrapper
    })

    expect(list.result.current.data).toEqual([
      { status: 200, data: page(saved) }
    ])
    await waitFor(() =>
      expect(detail.result.current.data).toEqual({
        status: 200,
        data: saved
      })
    )
  })

  it("updates mounted detail hooks in the same provider and preserves other providers", async () => {
    const original = transcription(1)
    const updated = transcription(1, "updated.wav")
    const getDetail = vi.fn(() => HttpResponse.json(original))
    server.use(
      http.get("/api/transcript/1", getDetail),
      http.get("/api/transcript", () => HttpResponse.json(page(updated)))
    )
    const wrapper = createWrapper()
    const detail = renderHook(() => ({ ...useTranscription(1) }), { wrapper })
    const isolatedDetail = renderHook(() => ({ ...useTranscription(1) }), {
      wrapper: createWrapper()
    })
    await waitFor(() => {
      expect(isolatedDetail.result.current.error).toBeUndefined()
      expect(detail.result.current.data).toEqual({
        status: 200,
        data: original
      })
      expect(isolatedDetail.result.current.data).toEqual({
        status: 200,
        data: original
      })
    })

    const list = renderHook(() => ({ ...useUserTranscriptions() }), { wrapper })
    await waitFor(() => {
      expect(detail.result.current.error).toBeUndefined()
      expect(list.result.current.data?.[0]?.status).toBe(200)
      expect(detail.result.current.data).toEqual({ status: 200, data: updated })
    })
    expect(isolatedDetail.result.current.data).toEqual({
      status: 200,
      data: original
    })
    expect(getDetail).toHaveBeenCalledTimes(2)
  })

  it("seeds detail caches from later pages as well as the first page", async () => {
    const first = transcription(1)
    const second = transcription(2)
    server.use(
      http.get("/api/transcript", ({ request }) =>
        HttpResponse.json(
          new URL(request.url).searchParams.has("cursor")
            ? page(second)
            : { ...page(first), nextCursor: "next-page" }
        )
      )
    )
    const wrapper = createWrapper()
    const list = renderHook(() => ({ ...useUserTranscriptions() }), { wrapper })
    await waitFor(() => expect(list.result.current.data?.[0]?.status).toBe(200))
    await act(async () => {
      await list.result.current.setSize(2)
    })
    await waitFor(() => expect(list.result.current.data).toHaveLength(2))

    // Unhandled detail requests fail: both entries must come from the list cache.
    const firstDetail = renderHook(() => ({ ...useTranscription(first.id) }), {
      wrapper
    })
    const secondDetail = renderHook(
      () => ({ ...useTranscription(second.id) }),
      { wrapper }
    )
    await waitFor(() => {
      expect(firstDetail.result.current.data).toEqual({
        status: 200,
        data: first
      })
      expect(secondDetail.result.current.data).toEqual({
        status: 200,
        data: second
      })
    })
  })
})

describe("useTranscription", () => {
  it("fetches the requested ID and parses JSON dates", async () => {
    const saved = transcription(42)
    server.use(http.get("/api/transcript/42", () => HttpResponse.json(saved)))
    const { result } = renderHook(() => ({ ...useTranscription(42) }), {
      wrapper: createWrapper()
    })

    await waitFor(() =>
      expect(result.current.data).toEqual({ status: 200, data: saved })
    )
    expect(result.current.error).toBeUndefined()
  })

  it.each([
    [400, "bad request"],
    [403, "forbidden"],
    [404, "not found"],
    [405, "invalid method"]
  ] as const)("returns a typed response for HTTP %i", async (status, error) => {
    server.use(
      http.get("/api/transcript/1", () =>
        HttpResponse.json({ error }, { status })
      )
    )
    const { result } = renderHook(() => ({ ...useTranscription(1) }), {
      wrapper: createWrapper()
    })

    await waitFor(() =>
      expect(result.current.data).toEqual({ status, data: { error } })
    )
    expect(result.current.error).toBeUndefined()
  })

  it.each([{ id: 1 }, { ...transcription(1), createdAt: "invalid date" }])(
    "reports schema validation failures without caching malformed data (%#)",
    async (body) => {
      server.use(http.get("/api/transcript/1", () => HttpResponse.json(body)))
      const { result } = renderHook(() => ({ ...useTranscription(1) }), {
        wrapper: createWrapper()
      })

      await waitFor(() => expect(result.current.error?.name).toBe("ZodError"))
      expect(result.current.data).toBeUndefined()
    }
  )

  it("reports unexpected HTTP statuses as fetch errors", async () => {
    server.use(
      http.get(
        "/api/transcript/1",
        () => new HttpResponse(null, { status: 500 })
      )
    )
    const { result } = renderHook(() => ({ ...useTranscription(1) }), {
      wrapper: createWrapper()
    })

    await waitFor(() =>
      expect(result.current.error?.message).toBe("Unexpected HTTP status: 500")
    )
    expect(result.current.data).toBeUndefined()
  })
})

describe("mutation cache coordination", () => {
  it("uploads multipart data, updates mounted details, and refreshes all loaded pages in the same provider", async () => {
    const limit = DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT
    const original = Array.from({ length: limit * 2 }, (_, index) =>
      transcription(index + 1)
    )
    const created = transcription(original.length + 1, "sample.wav")
    let transcriptions = original
    let uploaded:
      | { model: FormDataEntryValue | null; name: string; content: string }
      | undefined
    const listRequests: string[] = []
    const getDetail = vi.fn(() =>
      HttpResponse.json({ error: "not found" }, { status: 404 })
    )
    server.use(
      http.get("/api/transcript", ({ request }) => {
        const url = new URL(request.url)
        listRequests.push(url.search)
        const limit = Number(url.searchParams.get("limit"))
        const start = Number(url.searchParams.get("cursor") ?? 0)
        return HttpResponse.json({
          transcriptions: transcriptions.slice(start, start + limit),
          nextCursor:
            start + limit < transcriptions.length ? String(start + limit) : null
        })
      }),
      http.get(`/api/transcript/${created.id}`, getDetail),
      http.post("/api/transcript", async ({ request }) => {
        const form = await request.formData()
        const file = form.get("attachments") as File
        uploaded = {
          model: form.get("model"),
          name: file.name,
          content: await file.text()
        }
        transcriptions = [created, ...transcriptions]
        return HttpResponse.json(created, { status: 201 })
      })
    )
    const wrapper = createWrapper()
    const list = renderHook(() => ({ ...useUserTranscriptions() }), { wrapper })
    const isolatedList = renderHook(() => ({ ...useUserTranscriptions() }), {
      wrapper: createWrapper()
    })
    const detail = renderHook(() => ({ ...useTranscription(created.id) }), {
      wrapper
    })
    const file = audioFile()
    const upload = renderHook(() => ({ ...useTranscribe() }), { wrapper })
    await waitFor(() => {
      expect(list.result.current.data?.[0]?.status).toBe(200)
      expect(isolatedList.result.current.data?.[0]?.status).toBe(200)
      expect(detail.result.current.data?.status).toBe(404)
    })
    await act(async () => {
      await list.result.current.setSize(2)
    })
    await waitFor(() => {
      expect(list.result.current.data).toHaveLength(2)
      expect(list.result.current.isValidating).toBe(false)
    })
    const firstPageQuery = `?limit=${limit}`
    const secondPageQuery = `?limit=${limit}&cursor=${limit}`
    const firstPageRequests = listRequests.filter(
      (query) => query === firstPageQuery
    ).length
    const secondPageRequests = listRequests.filter(
      (query) => query === secondPageQuery
    ).length

    let returned: SavedTranscription | undefined
    await act(async () => {
      returned = await upload.result.current.trigger({
        modelId: "whisper1",
        file
      })
    })

    expect(returned).toEqual(created)
    expect(uploaded).toEqual({
      model: "whisper1",
      name: "sample.wav",
      content: "audio bytes"
    })
    await waitFor(() => {
      expect(detail.result.current.data).toEqual({ status: 200, data: created })
      expect(list.result.current.data).toEqual([
        {
          status: 200,
          data: {
            transcriptions: [created, ...original.slice(0, limit - 1)],
            nextCursor: String(limit)
          }
        },
        {
          status: 200,
          data: {
            transcriptions: original.slice(limit - 1, limit * 2 - 1),
            nextCursor: String(limit * 2)
          }
        }
      ])
    })
    expect(
      listRequests.filter((query) => query === firstPageQuery)
    ).toHaveLength(firstPageRequests + 1)
    expect(
      listRequests.filter((query) => query === secondPageQuery)
    ).toHaveLength(secondPageRequests + 1)
    expect(isolatedList.result.current.data).toEqual([
      {
        status: 200,
        data: {
          transcriptions: original.slice(0, limit),
          nextCursor: String(limit)
        }
      }
    ])
    expect(upload.result.current.data).toEqual(created)
    expect(upload.result.current.error).toBeUndefined()
    expect(upload.result.current.isMutating).toBe(false)
    expect(getDetail).toHaveBeenCalledTimes(1)
  })

  it("tracks upload state and resets it while preserving the seeded detail cache", async () => {
    const saved = transcription(1)
    const responseGate = Promise.withResolvers<void>()
    const post = vi.fn(async () => {
      await responseGate.promise
      return HttpResponse.json(saved, { status: 201 })
    })
    server.use(http.post("/api/transcript", post))
    const wrapper = createWrapper()
    const file = audioFile()
    const upload = renderHook(() => ({ ...useTranscribe() }), { wrapper })

    expect(post).not.toHaveBeenCalled()
    expect(upload.result.current.data).toBeUndefined()
    expect(upload.result.current.error).toBeUndefined()
    expect(upload.result.current.isMutating).toBe(false)

    let request: Promise<SavedTranscription> | undefined
    act(() => {
      request = upload.result.current.trigger({ modelId: "whisper1", file })
    })
    try {
      await waitFor(() => expect(upload.result.current.isMutating).toBe(true))
      expect(upload.result.current.data).toBeUndefined()
    } finally {
      await act(async () => {
        responseGate.resolve()
        await expect(request).resolves.toEqual(saved)
      })
    }
    await waitFor(() => expect(upload.result.current.data).toEqual(saved))
    expect(upload.result.current.error).toBeUndefined()
    expect(upload.result.current.isMutating).toBe(false)
    expect(post).toHaveBeenCalledTimes(1)

    act(() => upload.result.current.reset())
    expect(upload.result.current.data).toBeUndefined()
    expect(upload.result.current.error).toBeUndefined()
    expect(upload.result.current.isMutating).toBe(false)

    const detail = renderHook(() => ({ ...useTranscription(saved.id) }), {
      wrapper
    })
    await waitFor(() =>
      expect(detail.result.current.data).toEqual({ status: 200, data: saved })
    )
    expect(detail.result.current.error).toBeUndefined()
  })

  it("deletes with a 204 response and revalidates lists and details", async () => {
    const saved = transcription(1)
    const remaining = transcription(2)
    let deleted = false
    const responseGate = Promise.withResolvers<void>()
    const deleteRequest = vi.fn(async () => {
      await responseGate.promise
      deleted = true
      return new HttpResponse(null, { status: 204 })
    })
    const getPage = vi.fn(() =>
      HttpResponse.json(deleted ? page(remaining) : page(saved, remaining))
    )
    const getDetail = vi.fn(() =>
      deleted
        ? HttpResponse.json({ error: "not found" }, { status: 404 })
        : HttpResponse.json(saved)
    )
    server.use(
      http.get("/api/transcript", getPage),
      http.get("/api/transcript/1", getDetail),
      http.delete("/api/transcript/1", deleteRequest)
    )
    const wrapper = createWrapper()
    const list = renderHook(() => ({ ...useUserTranscriptions() }), { wrapper })
    const detail = renderHook(() => ({ ...useTranscription(1) }), { wrapper })
    const deletion = renderHook(() => ({ ...useTranscriptionDeletion(1) }), {
      wrapper
    })
    await waitFor(() => {
      expect(detail.result.current.error).toBeUndefined()
      expect(list.result.current.data).toEqual([
        { status: 200, data: page(saved, remaining) }
      ])
      expect(detail.result.current.data).toEqual({ status: 200, data: saved })
    })

    expect(deleteRequest).not.toHaveBeenCalled()
    expect(deletion.result.current.isMutating).toBe(false)
    let request: Promise<void> | undefined
    act(() => {
      request = deletion.result.current.trigger()
    })
    try {
      await waitFor(() => expect(deletion.result.current.isMutating).toBe(true))
      expect(list.result.current.data).toEqual([
        { status: 200, data: page(saved, remaining) }
      ])
      expect(detail.result.current.data).toEqual({ status: 200, data: saved })
    } finally {
      await act(async () => {
        responseGate.resolve()
        await expect(request).resolves.toBeUndefined()
      })
    }

    await waitFor(() => {
      expect(list.result.current.data).toEqual([
        { status: 200, data: page(remaining) }
      ])
      expect(detail.result.current.data).toEqual({
        status: 404,
        data: { error: "not found" }
      })
    })
    expect(getPage).toHaveBeenCalledTimes(2)
    expect(getDetail).toHaveBeenCalledTimes(2)
    expect(deleteRequest).toHaveBeenCalledTimes(1)
    expect(deletion.result.current.data).toBeUndefined()
    expect(deletion.result.current.error).toBeUndefined()
    expect(deletion.result.current.isMutating).toBe(false)
  })

  it.each([
    ["upload", "http"],
    ["upload", "network"],
    ["delete", "http"],
    ["delete", "unexpected status"],
    ["delete", "network"]
  ] as const)(
    "preserves caches when %s fails (%s)",
    async (operation, failure) => {
      const saved = transcription(1)
      const getPage = vi.fn(() => HttpResponse.json(page(saved)))
      const getDetail = vi.fn(() => HttpResponse.json(saved))
      server.use(
        http.get("/api/transcript", getPage),
        http.get("/api/transcript/1", getDetail),
        http.post("/api/transcript", () =>
          failure === "network"
            ? HttpResponse.error()
            : HttpResponse.json({ error: "forbidden" }, { status: 403 })
        ),
        http.delete("/api/transcript/1", () =>
          failure === "network"
            ? HttpResponse.error()
            : failure === "unexpected status"
              ? new HttpResponse(null, { status: 200 })
              : HttpResponse.json({ error: "forbidden" }, { status: 403 })
        )
      )
      const wrapper = createWrapper()
      const list = renderHook(() => ({ ...useUserTranscriptions() }), {
        wrapper
      })
      const detail = renderHook(() => ({ ...useTranscription(1) }), { wrapper })
      const file = audioFile()
      const mutation = renderHook(
        () => {
          const upload = { ...useTranscribe() }
          const deletion = { ...useTranscriptionDeletion(1) }
          return { upload, delete: deletion }
        },
        { wrapper }
      )
      await waitFor(() => {
        expect(list.result.current.data).toEqual([
          { status: 200, data: page(saved) }
        ])
        expect(detail.result.current.data).toEqual({ status: 200, data: saved })
      })
      const listRequests = getPage.mock.calls.length
      const detailRequests = getDetail.mock.calls.length

      await act(async () => {
        const request =
          operation === "upload"
            ? mutation.result.current.upload.trigger({
                modelId: "whisper1",
                file
              })
            : mutation.result.current.delete.trigger()
        if (failure === "network") {
          await expect(request).rejects.toThrow()
        } else {
          await expect(request).rejects.toThrow(
            operation === "upload"
              ? "Transcription failed: 403"
              : `Unexpected status: ${failure === "unexpected status" ? 200 : 403}`
          )
        }
      })

      await waitFor(() => {
        expect(mutation.result.current[operation].error).toBeInstanceOf(Error)
        expect(mutation.result.current[operation].isMutating).toBe(false)
        expect(detail.result.current.isValidating).toBe(false)
      })
      expect(mutation.result.current[operation].data).toBeUndefined()

      expect(list.result.current.data).toEqual([
        { status: 200, data: page(saved) }
      ])
      expect(detail.result.current.data).toEqual({ status: 200, data: saved })
      expect(getPage).toHaveBeenCalledTimes(listRequests)
      // Deletion keeps SWRMutation's default detail revalidation, even on errors.
      expect(getDetail).toHaveBeenCalledTimes(
        detailRequests + (operation === "delete" ? 1 : 0)
      )
    }
  )

  it("resets an upload error and accepts new model and file arguments on retry", async () => {
    const saved = {
      ...transcription(1, "retry.wav"),
      model: "transcribe1" as const
    }
    const uploads: Array<{
      model: FormDataEntryValue | null
      filename: string
    }> = []
    server.use(
      http.post("/api/transcript", async ({ request }) => {
        const form = await request.formData()
        uploads.push({
          model: form.get("model"),
          filename: (form.get("attachments") as File).name
        })
        return uploads.length === 1
          ? HttpResponse.json({ error: "forbidden" }, { status: 403 })
          : HttpResponse.json(saved, { status: 201 })
      })
    )
    const { result } = renderHook(() => ({ ...useTranscribe() }), {
      wrapper: createWrapper()
    })

    await act(async () => {
      await expect(
        result.current.trigger({ modelId: "whisper1", file: audioFile() })
      ).rejects.toThrow("Transcription failed: 403")
    })
    await waitFor(() =>
      expect(result.current.error?.message).toBe("Transcription failed: 403")
    )

    act(() => result.current.reset())
    expect(result.current.error).toBeUndefined()
    expect(result.current.data).toBeUndefined()
    expect(result.current.isMutating).toBe(false)

    await act(async () => {
      const file = new File(["retry bytes"], "retry.wav", { type: "audio/wav" })
      await expect(
        result.current.trigger({ modelId: "transcribe1", file })
      ).resolves.toEqual(saved)
    })
    await waitFor(() => expect(result.current.data).toEqual(saved))
    expect(result.current.error).toBeUndefined()
    expect(result.current.isMutating).toBe(false)
    expect(uploads).toEqual([
      { model: "whisper1", filename: "sample.wav" },
      { model: "transcribe1", filename: "retry.wav" }
    ])
  })

  it.each([200, 204])(
    "rejects an unexpected upload success status (%i)",
    async (status) => {
      const getDetail = vi.fn(() =>
        HttpResponse.json({ error: "not found" }, { status: 404 })
      )
      server.use(
        http.get("/api/transcript/1", getDetail),
        http.post("/api/transcript", () =>
          status === 204
            ? new HttpResponse(null, { status })
            : HttpResponse.json(transcription(1), { status })
        )
      )
      const wrapper = createWrapper()
      const detail = renderHook(() => ({ ...useTranscription(1) }), { wrapper })
      const upload = renderHook(() => ({ ...useTranscribe() }), { wrapper })
      await waitFor(() => expect(detail.result.current.data?.status).toBe(404))

      await act(async () => {
        await expect(
          upload.result.current.trigger({
            modelId: "whisper1",
            file: audioFile()
          })
        ).rejects.toThrow(`Unexpected status: ${status}`)
      })
      await waitFor(() =>
        expect(upload.result.current.error?.message).toBe(
          `Unexpected status: ${status}`
        )
      )
      expect(upload.result.current.data).toBeUndefined()
      expect(upload.result.current.isMutating).toBe(false)
      expect(detail.result.current.data).toEqual({
        status: 404,
        data: { error: "not found" }
      })
      expect(getDetail).toHaveBeenCalledTimes(1)
    }
  )

  it("rejects an invalid upload response without publishing it to detail hooks", async () => {
    server.use(
      http.get("/api/transcript/1", () =>
        HttpResponse.json({ error: "not found" }, { status: 404 })
      ),
      http.post("/api/transcript", () =>
        HttpResponse.json({ id: 1 }, { status: 201 })
      )
    )
    const wrapper = createWrapper()
    const detail = renderHook(() => ({ ...useTranscription(1) }), { wrapper })
    const file = audioFile()
    const upload = renderHook(() => ({ ...useTranscribe() }), { wrapper })
    await waitFor(() => expect(detail.result.current.data?.status).toBe(404))

    await act(async () => {
      await expect(
        upload.result.current.trigger({ modelId: "whisper1", file })
      ).rejects.toMatchObject({ name: "ZodError" })
    })
    await waitFor(() =>
      expect(upload.result.current.error?.name).toBe("ZodError")
    )
    expect(upload.result.current.data).toBeUndefined()
    expect(upload.result.current.isMutating).toBe(false)
    expect(detail.result.current.data).toEqual({
      status: 404,
      data: { error: "not found" }
    })
  })
})
