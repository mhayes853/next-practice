import { describe, expect, it } from "vitest"
import { transcriptionLabel } from "./transcription"

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
})
