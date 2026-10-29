import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_TOAST_DURATION, type Toast, useToasts } from "./Toast"

describe("useToasts", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("starts with no toasts", () => {
    const { result } = renderHook(() => useToasts())

    expect(result.current.toasts).toEqual([])
  })

  it.each<Toast["type"]>(["success", "error", "warning", "info"])(
    "presents a %s toast with its message and custom duration",
    (type) => {
      const { result } = renderHook(() => useToasts())
      const toast: Toast = { message: "Upload complete", type, duration: 5000 }

      act(() => result.current.present(toast))

      expect(result.current.toasts).toEqual([
        { ...toast, id: expect.any(Number) }
      ])
    }
  )

  it("appends toasts in order and assigns distinct IDs even for identical messages", () => {
    const { result } = renderHook(() => useToasts())
    const first: Toast = { message: "First", type: "info" }
    const second: Toast = { message: "Second", type: "warning" }

    act(() => {
      result.current.present(first)
      result.current.present(second)
      result.current.present(first)
    })

    expect(result.current.toasts).toEqual([
      { ...first, id: expect.any(Number) },
      { ...second, id: expect.any(Number) },
      { ...first, id: expect.any(Number) }
    ])
    expect(new Set(result.current.toasts.map((toast) => toast.id)).size).toBe(3)
  })

  it("automatically dismisses a toast after the default duration", () => {
    const { result } = renderHook(() => useToasts())
    act(() => result.current.present({ message: "Saved", type: "success" }))

    act(() => vi.advanceTimersByTime(DEFAULT_TOAST_DURATION - 1))
    expect(result.current.toasts).toHaveLength(1)

    act(() => vi.advanceTimersByTime(1))
    expect(result.current.toasts).toEqual([])
  })

  it.each([0, 100, DEFAULT_TOAST_DURATION + 1000])(
    "honors a custom duration of %i milliseconds",
    (duration) => {
      const { result } = renderHook(() => useToasts())
      act(() =>
        result.current.present({ message: "Saved", type: "success", duration })
      )

      act(() => vi.advanceTimersByTime(Math.max(0, duration - 1)))
      if (duration > 0) {
        expect(result.current.toasts).toHaveLength(1)
        act(() => vi.advanceTimersByTime(1))
      }
      expect(result.current.toasts).toEqual([])
    }
  )

  it("expires each toast relative to when it was presented", () => {
    const { result } = renderHook(() => useToasts())
    const first: Toast = { message: "First", type: "info" }
    const second: Toast = { message: "Second", type: "info" }
    act(() => result.current.present(first))
    act(() => vi.advanceTimersByTime(1000))
    act(() => result.current.present(second))
    const remaining = result.current.toasts[1]

    act(() => vi.advanceTimersByTime(DEFAULT_TOAST_DURATION - 1000))
    expect(result.current.toasts).toEqual([remaining])

    act(() => vi.advanceTimersByTime(999))
    expect(result.current.toasts).toEqual([remaining])

    act(() => vi.advanceTimersByTime(1))
    expect(result.current.toasts).toEqual([])
  })

  it("dismisses only the selected toast and cancels its pending expiry", () => {
    const { result } = renderHook(() => useToasts())
    act(() => {
      result.current.present({ message: "First", type: "info", duration: 1000 })
      result.current.present({ message: "Second", type: "info", duration: 5000 })
    })
    const [first, second] = result.current.toasts

    act(() => result.current.dismiss(first.id))
    expect(result.current.toasts).toEqual([second])
    expect(vi.getTimerCount()).toBe(1)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.toasts).toEqual([second])

    act(() => vi.advanceTimersByTime(4000))
    expect(result.current.toasts).toEqual([])
  })

  it("ignores unknown IDs and repeated dismissals", () => {
    const { result } = renderHook(() => useToasts())
    act(() => result.current.present({ message: "Saved", type: "success" }))
    const toast = result.current.toasts[0]

    act(() => result.current.dismiss(toast.id + 1))
    expect(result.current.toasts).toEqual([toast])

    act(() => {
      result.current.dismiss(toast.id)
      result.current.dismiss(toast.id)
    })
    expect(result.current.toasts).toEqual([])

    act(() => result.current.present({ message: "New toast", type: "info" }))
    expect(result.current.toasts[0].id).not.toBe(toast.id)

    act(() => result.current.dismiss(toast.id))
    expect(result.current.toasts).toHaveLength(1)
  })

  it("keeps separate hook instances independent", () => {
    const first = renderHook(() => useToasts())
    const second = renderHook(() => useToasts())

    act(() => first.result.current.present({ message: "First", type: "info" }))
    expect(second.result.current.toasts).toEqual([])

    act(() => second.result.current.present({ message: "Second", type: "info" }))
    const secondToast = second.result.current.toasts[0]

    act(() => first.result.current.dismiss(first.result.current.toasts[0].id))
    expect(first.result.current.toasts).toEqual([])
    expect(second.result.current.toasts).toEqual([secondToast])
  })
})
