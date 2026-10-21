import { DatabaseConnection } from "@/prisma/db"

export type UserID = number & { _tag: "user_id" }

export async function createUserIfNotExists(
  db: DatabaseConnection,
  name: string,
  email: string
) {
  const existing = await db.orm.public.User.where({ email }).select("id").first();
  if (existing) return existing.id as UserID
  return (await db.orm.public.User.create({ name, email })).id as UserID
}
