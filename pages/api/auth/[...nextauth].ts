import { createUserIfNotExists } from "@/lib/user";
import NextAuth, { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    signIn: async ({ user }) => {
      if (!user.name || !user.email) return false
      await createUserIfNotExists(user.name, user.email)
      return true
    }
  }
};

export default NextAuth(authOptions);
