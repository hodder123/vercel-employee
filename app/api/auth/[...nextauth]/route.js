export const runtime = "nodejs";

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

export const authOptions = {
  debug: true, // IMPORTANT: makes NextAuth print useful logs

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const username = (credentials?.username || "").trim();
        const password = (credentials?.password || "").trim();

        if (!username || !password) {
          throw new Error("MISSING_CREDS");
        }

        // TEMP: disable rate limit while debugging (we’ll re-enable after)
        // const { rateLimit } = await import("@/lib/rateLimiter");
        // const limitCheck = rateLimit(username);
        // if (!limitCheck.success) throw new Error("RATE_LIMITED");

        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
          throw new Error("NO_USER");
        }

        const ok = await verifyPassword(password, user.password);

        if (!ok) {
          throw new Error("BAD_PASSWORD");
        }

        return { id: user.username, name: user.username, role: user.role };
      },
    }),
  ],

  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session?.user) session.user.role = token.role;
      return session;
    },
  },

  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
