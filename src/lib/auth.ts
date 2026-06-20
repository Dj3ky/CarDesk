import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/en/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password || !user.isActive) {
          await logAudit({
            action: "LOGIN_FAILED",
            entity: "USER",
            entityId: user?.id ?? (credentials.email as string),
            entityLabel: user ? `${user.name} (${user.email})` : credentials.email as string,
            userId: null,
          });
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          await logAudit({
            action: "LOGIN_FAILED",
            entity: "USER",
            entityId: user.id,
            entityLabel: `${user.name} (${user.email})`,
            userId: null,
          });
          return null;
        }

        await logAudit({
          action: "LOGIN",
          entity: "USER",
          entityId: user.id,
          entityLabel: `${user.name} (${user.email})`,
          userId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
          permissions: user.permissions,
          language: user.language,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.permissions = (user as { permissions: string[] }).permissions ?? [];
        token.language = (user as { language: string }).language ?? "en";
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.language = (token.language as string) ?? "en";
      }
      return session;
    },
  },
});
