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

export type DurationComponents = {
  minutes: number
  seconds: number
}

export function durationComponents(millis: number): DurationComponents {
  const minutes = Math.floor(millis / 1000 / 60)
  const seconds = (millis / 1000) % 60
  return { minutes, seconds }
}
