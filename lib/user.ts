import { db } from "@/prisma/db"

export type UserID = number & { _tag: "user_id" }

export async function createUserIfNotExists(name: string, email: string) {
  return await db.transaction(async (tx) => {
    const existing = await tx.orm.public.User.where({ email }).select("id").first();
    if (existing) return existing.id as UserID
    return (await tx.orm.public.User.create({ name, email })).id as UserID
  })
}

export async function userWithId(id: UserID) {
  return await db.orm.public.User.first({ id })
}
