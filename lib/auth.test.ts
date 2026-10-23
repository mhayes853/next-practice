import { describe, expect, it } from "vitest"
import { authAdapter } from "./auth"
import { db } from "@/prisma/db"
import { userId } from "./user"

const TEST_USER = {
  name: "Blob",
  email: "blob@blob.com",
  emailVerified: null
} as const

describe("user tests", () => {
  it("should return a user after saving", async () => {
    const id = (await authAdapter.createUser(TEST_USER))!.id
    const idUser = await authAdapter.getUser(id)
    const emailUser = await authAdapter.getUserByEmail(TEST_USER.email)

    expect(idUser?.name).toEqual(TEST_USER.name)
    expect(idUser?.email).toEqual(TEST_USER.email)
    expect(idUser?.id).toEqual(id)
    expect(idUser).toEqual(emailUser)
  })

  it("should return a user by account after linking", async () => {
    const id = (await authAdapter.createUser(TEST_USER))!.id
    await authAdapter.linkAccount({ userId: id, providerAccountId: "blob" })
    const user = await authAdapter.getUserByAccount({
      provider: "",
      providerAccountId: "blob"
    })

    expect(user?.name).toEqual(TEST_USER.name)
    expect(user?.email).toEqual(TEST_USER.email)
    expect(user?.id).toEqual(id)
  })

  it("should have no provider account id after unlinking", async () => {
    const id = (await authAdapter.createUser(TEST_USER))!.id
    await authAdapter.linkAccount({ userId: id, providerAccountId: "blob" })
    await authAdapter.unlinkAccount({ providerAccountId: "blob" })
    const user = await db.orm.public.User.where({
      id: userId(id)
    }).firstOrThrow()

    expect(user.providerId).toBeNull()
  })

  it("should deduplicate users with the same email", async () => {
    const id = (await authAdapter.createUser(TEST_USER))!.id
    const id2 = (await authAdapter.createUser({
      ...TEST_USER,
      name: "Blob 2"
    }))!.id

    const idUser = await authAdapter.getUser(id)
    expect(id).toEqual(id2)
    expect(idUser?.name).toEqual("Blob 2")
    expect(idUser?.email).toEqual(TEST_USER.email)
  })

  it("should be able to delete an existing user", async () => {
    const id = (await authAdapter.createUser(TEST_USER))!.id
    await authAdapter.deleteUser(id)

    expect(await authAdapter.getUser(id)).toBeNull()
  })

  it("should be able to update an existing user", async () => {
    const id = (await authAdapter.createUser(TEST_USER))!.id
    await authAdapter.updateUser({
      id,
      name: "Blob 2",
      email: "blob2@blob.com"
    })
    const user = await authAdapter.getUser(id)

    expect(user?.name).toEqual("Blob 2")
    expect(user?.email).toEqual("blob2@blob.com")
  })
})
