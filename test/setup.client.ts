import { cleanup } from "@testing-library/react"
import { Blob, File } from "node:buffer"
import { fetch, FormData, Headers, Request, Response } from "undici"
import { afterAll, afterEach, beforeAll, vi } from "vitest"
import { server } from "./msw"

beforeAll(() => {
  if (!process.versions.bun) {
    // Node's fetch needs stream-capable files when serializing multipart bodies.
    vi.stubGlobal("Blob", Blob)
    vi.stubGlobal("File", File)
    vi.stubGlobal("FormData", FormData)
    vi.stubGlobal("Headers", Headers)
    vi.stubGlobal("Request", Request)
    vi.stubGlobal("Response", Response)
    vi.stubGlobal("fetch", fetch)
  }
  server.listen({ onUnhandledRequest: "error" })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
  if (!process.versions.bun) vi.unstubAllGlobals()
})
