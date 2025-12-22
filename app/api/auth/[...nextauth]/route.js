export const runtime = "nodejs";

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        console.log("AUTH 🔐 incoming credentials");

        if (!credentials?.username || !credentials?.password) {
          console.log("AUTH ❌ missing credentials");
          return null;
        }

        const username = credentials.username.trim();
        const password = credentials.password;

        console.log("AUTH 👤 username:", username);

        // Rate limiting
        const { rateLimit } = await import("@/lib/rateLimiter");
        const limitCheck = rateLimit(username);
        console.log("AUTH ⏱ rateLimit:", limitCheck);

        if (!limitCheck.success) {
          throw new Error(limitCheck.message);
        }

        const user = await prisma.user.findUnique({
          where: { username },
        });

        console.log("AUTH 📦 user found:", !!user);

        if (!user) {
          console.log("AUTH ❌ user not found in DB");
          return null;
        }

        console.log("AUTH 🔑 hash prefix:", user.password.slice(0, 10));

        const isValid = await verifyPassword(password, user.password);
        console.log("AUTH ✅ password match:", isValid);

        if (!isValid) {
          console.log("AUTH ❌ password mismatch");
          return null;
        }

        console.log("AUTH 🎉 success");

        return {
          id: user.username,
          name: user.username,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
