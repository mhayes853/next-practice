import { describe, expect, it } from "vitest"
import { createUserIfNotExists } from "./user"
import { db } from "@/prisma/db"

describe("user tests", () => {
  it("should return a user after saving", async () => {
    const id = await createUserIfNotExists(db, "Blob", "blob@blob.com")
    const user = await db.orm.public.User.where({ id }).firstOrThrow()

    expect(user.name).toEqual("Blob")
    expect(user.email).toEqual("blob@blob.com")
    expect(user.id).toEqual(id)
  })

  it("should return an existing user id for a duplicate email", async () => {
    const id = await createUserIfNotExists(db, "Blob", "blob@blob.com")
    const id2 = await createUserIfNotExists(db, "Blob 2", "blob@blob.com")

    expect(id).toEqual(id2)
  })
})
