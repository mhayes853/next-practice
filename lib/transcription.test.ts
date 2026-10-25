import { describe, expect, it } from "vitest"
import { decodeCursor, encodeCursor } from "./transcription"

describe("transcription tests", () => {
  it("should encode and decode a cursor", () => {
    const cursor = { id: 2 }
    const decoded = decodeCursor(encodeCursor(cursor))
    expect(cursor).toEqual(decoded)
  })

  it("should return undefined for an invalid cursor", () => {
    expect(decodeCursor("hello world")).toBeUndefined()
    expect(decodeCursor("YmxvYg==")).toBeUndefined()
    expect(decodeCursor("aW5m")).toBeUndefined()
  })
})
