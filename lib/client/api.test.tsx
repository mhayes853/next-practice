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

function transcription(id: number, filename = `recording-${id}.wav`): SavedTranscription {
  return {
    id,
    userId: 1,
    filename,
    model: "whisper1",
    segments: [{ content: "Hello", timestamp: 0, durationMillis: 1000 }],
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
    server.use(http.get("/api/transcript", ({ request }) => {
      requests.push(new URL(request.url).search)
      return HttpResponse.json(page(saved))
    }))

    const { result } = renderHook(() => ({ ...useUserTranscriptions() }), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.data).toEqual([
      { status: 200, data: page(saved) }
    ]))
    expect(requests).toEqual([`?limit=${DEFAULT_TRANSCRIPTIONS_PAGE_LIMIT}`])
    expect(result.current.error).toBeUndefined()
  })

  it("follows cursors with the requested limit and stops at the last page", async () => {
    const first = transcription(1)
    const second = transcription(2)
    const requests: string[] = []
    server.use(http.get("/api/transcript", ({ request }) => {
      const url = new URL(request.url)
      requests.push(url.search)
      return HttpResponse.json(url.searchParams.has("cursor")
        ? page(second)
        : { ...page(first), nextCursor: "next-page" })
    }))
    const { result } = renderHook(() => ({ ...useUserTranscriptions(undefined, 1) }), {
      wrapper: createWrapper()
    })
    await waitFor(() => expect(result.current.data?.[0]?.status).toBe(200))

    await act(async () => { await result.current.setSize(2) })
    await waitFor(() => expect(result.current.data).toEqual([
      { status: 200, data: { ...page(first), nextCursor: "next-page" } },
      { status: 200, data: page(second) }
    ]))
    expect(requests).toContain("?limit=1&cursor=next-page")

    await act(async () => { await result.current.setSize(3) })
    await waitFor(() => expect(result.current.isValidating).toBe(false))
    expect(result.current.data).toHaveLength(2)
    expect(requests.every(query =>
      query === "?limit=1" || query === "?limit=1&cursor=next-page"
    )).toBe(true)
  })

  it("returns a handled API error and does not request another page", async () => {
    const requests: string[] = []
    server.use(http.get("/api/transcript", ({ request }) => {
      requests.push(request.url)
      return HttpResponse.json({ error: "bad request" }, { status: 400 })
    }))
    const { result } = renderHook(() => ({ ...useUserTranscriptions() }), {
      wrapper: createWrapper()
    })
    await waitFor(() => expect(result.current.data).toEqual([
      { status: 400, data: { error: "bad request" } }
    ]))

    await act(async () => { await result.current.setSize(2) })
    await waitFor(() => expect(result.current.isValidating).toBe(false))
    expect(result.current.data).toHaveLength(1)
    // setSize may revalidate page one, but must never fetch a cursor page.
    expect(requests.every(url =>
      !new URL(url).searchParams.has("cursor")
    )).toBe(true)
    expect(result.current.error).toBeUndefined()
  })

  it("seeds detail hooks from the initial page without fetching", async () => {
    const saved = transcription(1)
    const wrapper = createWrapper({ revalidateOnMount: false })
    const list = renderHook(() => ({ ...useUserTranscriptions(page(saved)) }), { wrapper })
    const detail = renderHook(() => ({ ...useTranscription(saved.id) }), { wrapper })

    expect(list.result.current.data).toEqual([{ status: 200, data: page(saved) }])
    await waitFor(() => expect(detail.result.current.data).toEqual({
      status: 200, data: saved
    }))
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
      expect(detail.result.current.data).toEqual({ status: 200, data: original })
      expect(isolatedDetail.result.current.data).toEqual({ status: 200, data: original })
    })

    const list = renderHook(() => ({ ...useUserTranscriptions() }), { wrapper })
    await waitFor(() => {
      expect(detail.result.current.error).toBeUndefined()
      expect(list.result.current.data?.[0]?.status).toBe(200)
      expect(detail.result.current.data).toEqual({ status: 200, data: updated })
    })
    expect(isolatedDetail.result.current.data).toEqual({ status: 200, data: original })
    expect(getDetail).toHaveBeenCalledTimes(2)
  })

  it("seeds detail caches from later pages as well as the first page", async () => {
    const first = transcription(1)
    const second = transcription(2)
    server.use(http.get("/api/transcript", ({ request }) => HttpResponse.json(
      new URL(request.url).searchParams.has("cursor")
        ? page(second)
        : { ...page(first), nextCursor: "next-page" }
    )))
    const wrapper = createWrapper()
    const list = renderHook(() => ({ ...useUserTranscriptions(undefined, 1) }), { wrapper })
    await waitFor(() => expect(list.result.current.data?.[0]?.status).toBe(200))
    await act(async () => { await list.result.current.setSize(2) })
    await waitFor(() => expect(list.result.current.data).toHaveLength(2))

    // Unhandled detail requests fail: both entries must come from the list cache.
    const firstDetail = renderHook(() => ({ ...useTranscription(first.id) }), { wrapper })
    const secondDetail = renderHook(() => ({ ...useTranscription(second.id) }), { wrapper })
    await waitFor(() => {
      expect(firstDetail.result.current.data).toEqual({ status: 200, data: first })
      expect(secondDetail.result.current.data).toEqual({ status: 200, data: second })
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

    await waitFor(() => expect(result.current.data).toEqual({ status: 200, data: saved }))
    expect(result.current.error).toBeUndefined()
  })

  it.each([
    [400, "bad request"],
    [403, "forbidden"],
    [404, "not found"],
    [405, "invalid method"]
  ] as const)("returns a typed response for HTTP %i", async (status, error) => {
    server.use(http.get("/api/transcript/1", () => HttpResponse.json({ error }, { status })))
    const { result } = renderHook(() => ({ ...useTranscription(1) }), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.data).toEqual({ status, data: { error } }))
    expect(result.current.error).toBeUndefined()
  })

  it.each([
    { id: 1 },
    { ...transcription(1), createdAt: "invalid date" }
  ])("reports schema validation failures without caching malformed data (%#)", async (body) => {
    server.use(http.get("/api/transcript/1", () => HttpResponse.json(body)))
    const { result } = renderHook(() => ({ ...useTranscription(1) }), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.error?.name).toBe("ZodError"))
    expect(result.current.data).toBeUndefined()
  })

  it("reports unexpected HTTP statuses as fetch errors", async () => {
    server.use(http.get("/api/transcript/1", () => new HttpResponse(null, { status: 500 })))
    const { result } = renderHook(() => ({ ...useTranscription(1) }), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.error?.message).toBe("Unexpected HTTP status: 500"))
    expect(result.current.data).toBeUndefined()
  })
})

describe("mutation cache coordination", () => {
  it("uploads multipart data, updates mounted details, and refreshes all pages of the matching list", async () => {
    const first = transcription(1)
    const second = transcription(2)
    const created = transcription(3, "sample.wav")
    let transcriptions = [first, second]
    let uploaded: { model: FormDataEntryValue | null; name: string; content: string } | undefined
    const listRequests: string[] = []
    const getDetail = vi.fn(() => HttpResponse.json({ error: "not found" }, { status: 404 }))
    server.use(
      http.get("/api/transcript", ({ request }) => {
        const url = new URL(request.url)
        listRequests.push(url.search)
        const limit = Number(url.searchParams.get("limit"))
        const start = Number(url.searchParams.get("cursor") ?? 0)
        return HttpResponse.json({
          transcriptions: transcriptions.slice(start, start + limit),
          nextCursor: start + limit < transcriptions.length ? String(start + limit) : null
        })
      }),
      http.get("/api/transcript/3", getDetail),
      http.post("/api/transcript", async ({ request }) => {
        const form = await request.formData()
        const file = form.get("attachments") as File
        uploaded = { model: form.get("model"), name: file.name, content: await file.text() }
        transcriptions = [created, ...transcriptions]
        return HttpResponse.json(created, { status: 201 })
      })
    )
    const wrapper = createWrapper()
    const list = renderHook(() => ({ ...useUserTranscriptions(undefined, 1) }), { wrapper })
    const otherList = renderHook(() => ({ ...useUserTranscriptions(undefined, 2) }), { wrapper })
    const detail = renderHook(() => ({ ...useTranscription(3) }), { wrapper })
    const file = audioFile()
    const upload = renderHook(() => useTranscribe("whisper1", file, 1), { wrapper })
    await waitFor(() => {
      expect(list.result.current.data?.[0]?.status).toBe(200)
      expect(otherList.result.current.data?.[0]?.status).toBe(200)
      expect(detail.result.current.data?.status).toBe(404)
    })
    await act(async () => { await list.result.current.setSize(2) })
    await waitFor(() => {
      expect(list.result.current.data).toHaveLength(2)
      expect(list.result.current.isValidating).toBe(false)
    })
    const firstPageRequests = listRequests.filter(query => query === "?limit=1").length
    const secondPageRequests = listRequests.filter(query => query === "?limit=1&cursor=1").length

    let returned: SavedTranscription | undefined
    await act(async () => { returned = await upload.result.current() })

    expect(returned).toEqual(created)
    expect(uploaded).toEqual({ model: "whisper1", name: "sample.wav", content: "audio bytes" })
    await waitFor(() => {
      expect(detail.result.current.data).toEqual({ status: 200, data: created })
      expect(list.result.current.data).toEqual([
        { status: 200, data: { ...page(created), nextCursor: "1" } },
        { status: 200, data: { ...page(first), nextCursor: "2" } }
      ])
    })
    expect(listRequests.filter(query => query === "?limit=1")).toHaveLength(firstPageRequests + 1)
    expect(listRequests.filter(query => query === "?limit=1&cursor=1")).toHaveLength(secondPageRequests + 1)
    expect(listRequests.filter(query => query === "?limit=2")).toHaveLength(1)
    expect(otherList.result.current.data).toEqual([{ status: 200, data: page(first, second) }])
    expect(getDetail).toHaveBeenCalledTimes(1)
  })

  it("seeds the upload result before any list or detail hook is mounted", async () => {
    const saved = transcription(1)
    server.use(http.post("/api/transcript", () => HttpResponse.json(saved, { status: 201 })))
    const wrapper = createWrapper()
    const file = audioFile()
    const upload = renderHook(() => useTranscribe("whisper1", file), { wrapper })

    await act(async () => { expect(await upload.result.current()).toEqual(saved) })

    const detail = renderHook(() => ({ ...useTranscription(saved.id) }), { wrapper })
    await waitFor(() => expect(detail.result.current.data).toEqual({ status: 200, data: saved }))
    expect(detail.result.current.error).toBeUndefined()
  })

  it.each([undefined, 2])("deletes with a 204 response and revalidates lists and details (limit %s)", async (limit) => {
    const saved = transcription(1)
    const remaining = transcription(2)
    let deleted = false
    const getPage = vi.fn(() => HttpResponse.json(deleted ? page(remaining) : page(saved, remaining)))
    const getDetail = vi.fn(() => deleted
      ? HttpResponse.json({ error: "not found" }, { status: 404 })
      : HttpResponse.json(saved))
    server.use(
      http.get("/api/transcript", getPage),
      http.get("/api/transcript/1", getDetail),
      http.delete("/api/transcript/1", () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    const wrapper = createWrapper()
    const list = renderHook(() => ({ ...useUserTranscriptions(undefined, limit) }), { wrapper })
    const detail = renderHook(() => ({ ...useTranscription(1) }), { wrapper })
    const deletion = renderHook(() => useTranscriptionDeletion(1, limit), { wrapper })
    await waitFor(() => {
      expect(detail.result.current.error).toBeUndefined()
      expect(list.result.current.data).toEqual([{ status: 200, data: page(saved, remaining) }])
      expect(detail.result.current.data).toEqual({ status: 200, data: saved })
    })

    await act(async () => { await deletion.result.current() })

    await waitFor(() => {
      expect(list.result.current.data).toEqual([{ status: 200, data: page(remaining) }])
      expect(detail.result.current.data).toEqual({ status: 404, data: { error: "not found" } })
    })
    expect(getPage).toHaveBeenCalledTimes(2)
    expect(getDetail).toHaveBeenCalledTimes(2)
  })

  it.each([
    ["upload", "http"],
    ["upload", "network"],
    ["delete", "http"],
    ["delete", "network"]
  ] as const)("preserves caches when %s fails (%s)", async (operation, failure) => {
    const saved = transcription(1)
    const getPage = vi.fn(() => HttpResponse.json(page(saved)))
    const getDetail = vi.fn(() => HttpResponse.json(saved))
    server.use(
      http.get("/api/transcript", getPage),
      http.get("/api/transcript/1", getDetail),
      http.post("/api/transcript", () => failure === "network"
        ? HttpResponse.error()
        : HttpResponse.json({ error: "forbidden" }, { status: 403 })),
      http.delete("/api/transcript/1", () => failure === "network"
        ? HttpResponse.error()
        : HttpResponse.json({ error: "forbidden" }, { status: 403 }))
    )
    const wrapper = createWrapper()
    const list = renderHook(() => ({ ...useUserTranscriptions() }), { wrapper })
    const detail = renderHook(() => ({ ...useTranscription(1) }), { wrapper })
    const file = audioFile()
    const mutation = renderHook(() => {
      const upload = useTranscribe("whisper1", file)
      const deletion = useTranscriptionDeletion(1)
      return operation === "upload" ? upload : deletion
    }, { wrapper })
    await waitFor(() => {
      expect(list.result.current.data).toEqual([{ status: 200, data: page(saved) }])
      expect(detail.result.current.data).toEqual({ status: 200, data: saved })
    })
    const listRequests = getPage.mock.calls.length
    const detailRequests = getDetail.mock.calls.length

    await act(async () => {
      if (failure === "network") {
        await expect(mutation.result.current()).rejects.toThrow()
      } else {
        expect(await mutation.result.current()).toBeUndefined()
      }
    })

    expect(list.result.current.data).toEqual([{ status: 200, data: page(saved) }])
    expect(detail.result.current.data).toEqual({ status: 200, data: saved })
    expect(getPage).toHaveBeenCalledTimes(listRequests)
    expect(getDetail).toHaveBeenCalledTimes(detailRequests)
  })

  it("rejects an invalid upload response without publishing it to detail hooks", async () => {
    server.use(
      http.get("/api/transcript/1", () => HttpResponse.json({ error: "not found" }, { status: 404 })),
      http.post("/api/transcript", () => HttpResponse.json({ id: 1 }, { status: 201 }))
    )
    const wrapper = createWrapper()
    const detail = renderHook(() => ({ ...useTranscription(1) }), { wrapper })
    const file = audioFile()
    const upload = renderHook(() => useTranscribe("whisper1", file), { wrapper })
    await waitFor(() => expect(detail.result.current.data?.status).toBe(404))

    await act(async () => {
      await expect(upload.result.current()).rejects.toMatchObject({ name: "ZodError" })
    })
    expect(detail.result.current.data).toEqual({ status: 404, data: { error: "not found" } })
  })
})
