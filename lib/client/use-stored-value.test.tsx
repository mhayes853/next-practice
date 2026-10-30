import { act, cleanup, renderHook } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useStoredValue } from "./use-stored-value"

describe("useStoredValue", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it("returns null for a missing browser value without writing the server fallback", () => {
    const { result } = renderHook(() => useStoredValue("model", "fallback"))

    expect(result.current[0]).toBeNull()
    expect(window.localStorage.getItem("model")).toBeNull()
  })

  it.each(["whisper1", "", "null", '{"model":"whisper1"}'])(
    "reads the stored string verbatim (%j)",
    (value) => {
      window.localStorage.setItem("model", value)

      const { result } = renderHook(() => useStoredValue("model", "fallback"))

      expect(result.current[0]).toBe(value)
    }
  )

  it("persists a new value and updates the mounted hook", () => {
    const { result } = renderHook(() => useStoredValue("model", null))

    act(() => result.current[1]("whisper1"))

    expect(result.current[0]).toBe("whisper1")
    expect(window.localStorage.getItem("model")).toBe("whisper1")
  })

  it("stores an empty string without removing the key", () => {
    window.localStorage.setItem("model", "whisper1")
    const { result } = renderHook(() => useStoredValue("model", null))

    act(() => result.current[1](""))

    expect(result.current[0]).toBe("")
    expect(window.localStorage.getItem("model")).toBe("")
  })

  it("removes the key and updates the hook when set to null", () => {
    window.localStorage.setItem("model", "whisper1")
    window.localStorage.setItem("language", "en")
    const { result } = renderHook(() => useStoredValue("model", null))

    act(() => result.current[1](null))

    expect(result.current[0]).toBeNull()
    expect(window.localStorage.getItem("model")).toBeNull()
    expect(window.localStorage.getItem("language")).toBe("en")
  })

  it("passes null to an updater when the key is absent", () => {
    const { result } = renderHook(() =>
      useStoredValue<string>("model", "fallback")
    )

    act(() => result.current[1]((previous) => previous ?? "whisper1"))

    expect(result.current[0]).toBe("whisper1")
    expect(window.localStorage.getItem("model")).toBe("whisper1")
  })

  it("applies consecutive updater functions to the latest stored value", () => {
    window.localStorage.setItem("counter", "0")
    const { result } = renderHook(() => useStoredValue("counter", null))

    act(() => {
      const setValue = result.current[1]
      setValue((previous) => String(Number(previous) + 1))
      setValue((previous) => String(Number(previous) + 1))
    })

    expect(result.current[0]).toBe("2")
    expect(window.localStorage.getItem("counter")).toBe("2")
  })

  it("allows updater functions to remove the stored value", () => {
    window.localStorage.setItem("model", "whisper1")
    const { result } = renderHook(() => useStoredValue("model", null))

    act(() => result.current[1](() => null))

    expect(result.current[0]).toBeNull()
    expect(window.localStorage.getItem("model")).toBeNull()
  })

  it("synchronizes consumers of the same key in the current window", () => {
    const first = renderHook(() => useStoredValue("model", null))
    const second = renderHook(() => useStoredValue("model", null))

    act(() => first.result.current[1]("whisper1"))
    expect(first.result.current[0]).toBe("whisper1")
    expect(second.result.current[0]).toBe("whisper1")

    act(() => second.result.current[1](null))
    expect(first.result.current[0]).toBeNull()
    expect(second.result.current[0]).toBeNull()
  })

  it("keeps values stored under different keys independent", () => {
    window.localStorage.setItem("language", "en")
    const model = renderHook(() => useStoredValue("model", null))
    const language = renderHook(() => useStoredValue("language", null))

    act(() => model.result.current[1]("whisper1"))

    expect(language.result.current[0]).toBe("en")
    expect(window.localStorage.getItem("language")).toBe("en")
  })

  it("reads and writes the new key after the key prop changes", () => {
    window.localStorage.setItem("first", "one")
    window.localStorage.setItem("second", "two")
    const { result, rerender } = renderHook(
      ({ key }) => useStoredValue(key, null),
      { initialProps: { key: "first" } }
    )

    rerender({ key: "second" })
    expect(result.current[0]).toBe("two")

    act(() => result.current[1]("updated"))
    expect(result.current[0]).toBe("updated")
    expect(window.localStorage.getItem("second")).toBe("updated")
    expect(window.localStorage.getItem("first")).toBe("one")
  })

  it("reads persisted changes after unmounting and mounting again", () => {
    const first = renderHook(() => useStoredValue("model", null))
    act(() => first.result.current[1]("whisper1"))
    first.unmount()

    const second = renderHook(() => useStoredValue("model", null))

    expect(second.result.current[0]).toBe("whisper1")
  })

  it.each(["whisper1", null])(
    "receives storage changes from another window (%j)",
    (newValue) => {
      window.localStorage.setItem("model", "original")
      const { result } = renderHook(() => useStoredValue("model", null))

      act(() => {
        // Browsers update storage before notifying the other windows.
        if (newValue === null) window.localStorage.removeItem("model")
        else window.localStorage.setItem("model", newValue)
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "model",
            oldValue: "original",
            newValue,
            storageArea: window.localStorage
          })
        )
      })

      expect(result.current[0]).toBe(newValue)
    }
  )

  it("receives storage clear events from another window", () => {
    window.localStorage.setItem("model", "whisper1")
    const { result } = renderHook(() => useStoredValue("model", null))

    act(() => {
      window.localStorage.clear()
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: null,
          storageArea: window.localStorage
        })
      )
    })

    expect(result.current[0]).toBeNull()
  })

  it.each(["fallback", null])(
    "uses the initial value during server rendering (%j)",
    (initialValue) => {
      window.localStorage.setItem("model", "browser value")
      function StoredValue() {
        const [value] = useStoredValue("model", initialValue)
        return <span>{value}</span>
      }

      expect(renderToString(<StoredValue />)).toBe(
        initialValue === null ? "<span></span>" : "<span>fallback</span>"
      )
      expect(window.localStorage.getItem("model")).toBe("browser value")
    }
  )
})
