import { describe, expect, it } from "vitest"
import { decodeCursor, encodeCursor } from "./transcription"
import { base64URLEncode } from "./utils"

describe("transcription tests", () => {
  it("should encode and decode a cursor", () => {
    const cursor = { id: 2, date: new Date() }
    const decoded = decodeCursor(encodeCursor(cursor))
    expect(cursor).toEqual(decoded)
  })

  it("should return undefined for an invalid cursor", () => {
    expect(decodeCursor("hello world")).toBeUndefined()
    expect(decodeCursor(base64URLEncode("2"))).toBeUndefined()
  })
})
