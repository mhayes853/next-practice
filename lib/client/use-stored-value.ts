import { useCallback, useSyncExternalStore } from "react"

const LOCAL_STORAGE_CHANGE_EVENT = "local-storage-change"

export function useStoredValue(
  key: string,
  initialValue: string | null
): [string | null, React.Dispatch<React.SetStateAction<string | null>>] {
  const value = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    () => initialValue
  )
  return [
    value,
    useCallback(
      (newValue) => {
        if (typeof newValue === "function") {
          store(key, newValue(window.localStorage.getItem(key)))
        } else {
          store(key, newValue)
        }
      },
      [key]
    )
  ]
}

function store(key: string, value: string | null) {
  if (value === null) {
    window.localStorage.removeItem(key)
  } else {
    window.localStorage.setItem(key, value)
  }
  window.dispatchEvent(new Event(LOCAL_STORAGE_CHANGE_EVENT))
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(LOCAL_STORAGE_CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(LOCAL_STORAGE_CHANGE_EVENT, callback)
  }
}
