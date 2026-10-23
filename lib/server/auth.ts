import { db } from "@/prisma/db"
import { NextAuthOptions } from "next-auth"
import { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters"
import GitHubProvider from "next-auth/providers/github"
import { Models } from "@/prisma/contract"
import { userId } from "../user"

export const authAdapter = {
  createUser: async (user: Omit<AdapterUser, "id">) => {
    if (!user.name || !user.email) throw new Error("Invalid user")
    const dbUser = await db.orm.public.User.upsert({
      create: {
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified
      },
      update: {
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified
      },
      conflictOn: { email: user.email }
    })
    return authUser(dbUser)
  },
  getUser: async (id) => await authUserById(id),
  getUserByEmail: async (email) => {
    const user = await db.orm.public.User.where({ email })
      .select("id", "email", "emailVerified", "name")
      .first()
    return authUser(user)
  },
  linkAccount: async (
    account: Pick<AdapterAccount, "userId" | "providerAccountId">
  ) => {
    await db.orm.public.User.where({ id: userId(account.userId) }).update({
      providerId: account.providerAccountId
    })
  },
  unlinkAccount: async ({
    providerAccountId
  }: Pick<AdapterAccount, "providerAccountId">) => {
    await db.orm.public.User.where({ providerId: providerAccountId }).update({
      providerId: null
    })
  },
  getUserByAccount: async (account) => {
    const user = await db.orm.public.User.where({
      providerId: account.providerAccountId
    })
      .select("id", "email", "emailVerified", "name")
      .first()
    return authUser(user)
  },
  updateUser: async (user) => {
    if (user.name === null) throw new Error("Name cannot be null")
    const updatedUser = authUser(
      await db.orm.public.User.where({
        id: userId(user.id)
      }).update({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified
      })
    )
    if (!updatedUser) throw new Error("User does not exist")
    return updatedUser
  },
  deleteUser: async (id) => {
    return authUser(await db.orm.public.User.where({ id: userId(id) }).delete())
  }
} as const satisfies Adapter

async function authUserById(id: string) {
  const user = await db.orm.public.User.where({ id: userId(id) })
    .select("id", "email", "emailVerified", "name")
    .first()
  return authUser(user)
}

function authUser(
  user: Pick<
    Models.public_User,
    "id" | "name" | "email" | "emailVerified"
  > | null
): AdapterUser | null {
  return !user ? null : { ...user, id: user.id.toString(), image: null }
}

export const authOptions: NextAuthOptions = {
  adapter: authAdapter,
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!
    })
  ],
  session: {
    strategy: "jwt"
  }
}
