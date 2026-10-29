export function compactMap<T, U>(
  arr: T[],
  fn: (item: T) => U | undefined | null
): U[] {
  return arr.reduce((acc, item) => {
    const result = fn(item)
    if (result) acc.push(result)
    return acc
  }, [] as U[])
}

export function occurences(
  str: string,
  query: string
): { start: number; end: number }[] {
  const indices: { start: number; end: number }[] = []
  let start = 0
  while (start < str.length) {
    const index = str.indexOf(query, start)
    if (index === -1) break
    indices.push({ start: index, end: index + query.length })
    start = index + query.length
  }
  return indices
}

export function base64URLDecode(input: string) {
  input = input.replace(/-/g, "+").replace(/_/g, "/")
  const padLength = (4 - (input.length % 4)) % 4
  input += "=".repeat(padLength)
  return atob(input)
}

export function base64URLEncode(input: string) {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export type Unsubscribe = () => void

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve()
    }, ms)
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer)
        reject(new Error("Aborted"))
      })
    }
  })
}
