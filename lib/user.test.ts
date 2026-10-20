import { describe, expect, it } from "vitest";
import { createUserIfNotExists, UserID, userWithId } from "./user";

describe("user tests", () => {
  it("should return a user after saving", async () => {
    const id = await createUserIfNotExists("Blob", "blob@blob.com")
    const user = await userWithId(id)

    expect(user!.name).toEqual("Blob")
    expect(user!.email).toEqual("blob@blob.com")
    expect(user!.id).toEqual(id)
  })

  it("should return null for a non-existent user", async () => {
    const user = await userWithId(420 as UserID)
    expect(user).toBeNull()
  })

  it("should return an existing user id for a duplicate email", async () => {
    const id = await createUserIfNotExists("Blob", "blob@blob.com")
    const id2 = await createUserIfNotExists("Blob 2", "blob@blob.com")

    expect(id).toEqual(id2)
  })
})
