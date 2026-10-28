export type DurationComponents = {
  minutes: number
  seconds: number
}

export function durationComponents(millis: number): DurationComponents {
  const minutes = Math.floor(millis / 1000 / 60)
  const seconds = Math.floor((millis / 1000) % 60)
  return { minutes, seconds }
}

export function formattedDuration(millis: number): string {
  const { minutes, seconds } = durationComponents(millis)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
