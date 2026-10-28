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
