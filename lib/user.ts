import z from "zod"

export const UserIDSchema: z.ZodType<UserID> = z.number()

export type UserID = number

export const userId = parseInt
