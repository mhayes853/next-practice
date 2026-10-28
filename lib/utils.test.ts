import { describe, test, expect } from "vitest"
import { base64URLEncode, base64URLDecode, durationComponents } from "./utils"

describe("utils tests", () => {
  describe("base64 url coding tests", () => {
    test("encode", () => {
      expect(base64URLEncode("hello, world")).toEqual("aGVsbG8sIHdvcmxk")
    })

    test("decode", () => {
      expect(base64URLDecode("aGVsbG8sIHdvcmxk")).toEqual("hello, world")
    })
  })

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
})
