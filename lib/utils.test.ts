import { describe, test, expect } from "vitest"
import { base64URLEncode, base64URLDecode } from "./utils"

describe("utils tests", () => {
  describe("base64 url coding tests", () => {
    test("encode", () => {
      expect(base64URLEncode("hello, world")).toEqual("aGVsbG8sIHdvcmxk")
    })

    test("decode", () => {
      expect(base64URLDecode("aGVsbG8sIHdvcmxk")).toEqual("hello, world")
    })
  })
})
