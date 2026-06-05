import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { resolveUserFromEcoSession } from "@/lib/eco-auth-bridge";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/panel-session-server";

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function getSessionUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const claims = verifySession(token);
    if (claims) {
      const user = await prisma.user.findUnique({ where: { login: claims.login } });
      if (user) return user;
    }
  }
  return resolveUserFromEcoSession();
}
