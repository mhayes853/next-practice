/* eslint-disable react-hooks/refs */
import { useRef } from "react"

export function useLastDefinedValue<T>(value: T | undefined): T | undefined {
  const lastValue = useRef(value)
  lastValue.current = value ?? lastValue.current
  return lastValue.current
}
