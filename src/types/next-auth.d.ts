import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      permissions: string[];
      language: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    permissions: string[];
    language: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    permissions: string[];
    language: string;
  }
}
