import { z } from "zod"

export type ZodInferredResponse<T extends Record<number, z.ZodType>> = {
  [S in keyof T]: {
    status: S extends number ? S : never
    data: z.output<T[S]>
  }
}[keyof T]

export function zodFetcher<const T extends Record<number, z.ZodType>>(
  schemas: T
) {
  return async (url: string): Promise<ZodInferredResponse<T>> => {
    const response = await fetch(url)

    const schema = schemas[response.status]
    if (!schema) throw new Error(`Unexpected HTTP status: ${response.status}`)

    const data = await schema.parseAsync(await response.json())

    return {
      status: response.status,
      data
    } as ZodInferredResponse<T>
  }
}
