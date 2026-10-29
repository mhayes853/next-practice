import { describe, expect, it } from "vitest"
import { searchSegments, transcriptionLabel } from "./transcription"

describe("transcriptionLabel", () => {
  it("returns the correct label for English", () => {
    const label = transcriptionLabel({ language: "en", audioDurationMillis: 0 })
    expect(label).toBe("English (0:00)")
  })

  it("returns the correct label for English with audio duration", () => {
    const label = transcriptionLabel({
      language: "en",
      audioDurationMillis: 60000
    })
    expect(label).toBe("English (1:00)")
  })

  it("uses an unknown language for an unknown language", () => {
    const label = transcriptionLabel({
      language: "blob",
      audioDurationMillis: 0
    })
    expect(label).toBe("blob (0:00)")
  })

  it("searches for a query in the transcription segments", () => {
    const segments = [
      { id: 0, content: "Hello world", timestamp: 0, durationMillis: 1000 },
      { id: 1, content: "Goodbye world", timestamp: 10, durationMillis: 1000 }
    ]
    const result = searchSegments(segments, "world")
    expect(result).toHaveLength(2)
    expect(result[0].highlightRegions).toEqual([{ start: 6, end: 11 }])
    expect(result[1].highlightRegions).toEqual([{ start: 8, end: 13 }])
  })

  it("searches reports an empty array for no matches", () => {
    const segments = [
      { id: 0, content: "Hello world", timestamp: 0, durationMillis: 1000 },
      { id: 1, content: "Goodbye world", timestamp: 10, durationMillis: 1000 }
    ]
    const result = searchSegments(segments, "blob")
    expect(result).toHaveLength(0)
  })
})
