import { db } from "@/prisma/db"
import { getServerSession, NextAuthOptions, Session } from "next-auth"
import { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters"
import GitHubProvider from "next-auth/providers/github"
import { Models } from "@/prisma/contract"
import { UserID, userId } from "../user"
import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  NextApiRequest,
  NextApiResponse,
  PreviewData
} from "next"
import type { DefaultSession } from "next-auth"
import { ParsedUrlQuery } from "querystring"

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

declare module "next-auth" {
  interface Session {
    user: {
      id: UserID
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: UserID
  }
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
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.userId = userId(user.id)
      return token
    },
    session: async ({ token, session }) => {
      session.user.id = token.userId
      return session
    }
  }
}

export type SessionResolver = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<Session | null>

export function authenticatedHandler<TData>(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse<TData>,
    session: Session
  ) => Promise<void>,
  resolveSession: SessionResolver = (req, res) =>
    getServerSession(req, res, authOptions)
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await resolveSession(req, res)
    if (!session) return res.status(401).json({ error: "unauthorized" })
    await handler(req, res, session)
  }
}

export type AuthenticatedContext<
  Params extends ParsedUrlQuery = ParsedUrlQuery
> = GetServerSidePropsContext<Params, PreviewData> & {
  session: Session
}

export function authenticatedGetServerSideProps<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Props extends { [key: string]: any },
  Params extends ParsedUrlQuery = ParsedUrlQuery
>(
  handler: (
    context: AuthenticatedContext<Params>
  ) => Promise<GetServerSidePropsResult<Props>>
): GetServerSideProps<Props, Params> {
  return async (context) => {
    const session = await getServerSession(
      context.req,
      context.res,
      authOptions
    )
    if (!session) {
      return { redirect: { destination: "/sign-in", permanent: false } }
    }
    return handler({ ...context, session })
  }
}
