import { describe, test, expect } from "vitest"
import { durationComponents } from "./duration-components"

describe("duration components tests", () => {
  test("durationComponents", () => {
    const result = durationComponents(1000)
    expect(result).toEqual({ minutes: 0, seconds: 1 })

    const result2 = durationComponents(60000)
    expect(result2).toEqual({ minutes: 1, seconds: 0 })

    const result3 = durationComponents(123456)
    expect(result3).toEqual({ minutes: 2, seconds: 3 })
  })
})
