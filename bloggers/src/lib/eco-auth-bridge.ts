import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SUPERADMIN_LOGIN, normalizeUsername } from "@/lib/panel-auth-utils";
import {
  ECO_COOKIE,
  ecosystemAuthEnabled,
  verifyEcoSession,
  type EcoSession,
} from "@/lib/ecosystem-gate";

export async function getEcoSession(): Promise<EcoSession | null> {
  if (!ecosystemAuthEnabled()) return null;
  const token = (await cookies()).get(ECO_COOKIE)?.value;
  if (!token) return null;
  return verifyEcoSession(token);
}

export async function resolveUserFromEcoSession(): Promise<User | null> {
  const session = await getEcoSession();
  if (!session) return null;

  const tg = normalizeUsername(session.telegramUsername);
  if (tg) {
    const direct = await prisma.user.findUnique({ where: { login: tg } });
    if (direct) return direct;
    const users = await prisma.user.findMany();
    const match = users.find((u) => normalizeUsername(u.login) === tg);
    if (match) return match;
  }

  if (session.isSuperAdmin) {
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["superadmin", "admin"] } },
      orderBy: { createdAt: "asc" },
    });
    if (admin) return admin;
    const fallback = await prisma.user.findUnique({ where: { login: SUPERADMIN_LOGIN } });
    if (fallback) return fallback;
    const login = tg || SUPERADMIN_LOGIN;
    return prisma.user.upsert({
      where: { login },
      create: { login, passwordHash: "eco:locked", role: "superadmin" },
      update: { role: "superadmin" },
    });
  }

  return null;
}

export async function hasEcoSession(): Promise<boolean> {
  return (await getEcoSession()) != null;
}
