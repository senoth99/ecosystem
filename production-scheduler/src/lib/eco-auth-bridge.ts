import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { UserRole } from "./enums";
import {
  ECO_COOKIE,
  ecosystemAuthEnabled,
  verifyEcoSession,
  type EcoSession,
} from "./ecosystem-gate";

export async function getEcoSession(): Promise<EcoSession | null> {
  if (!ecosystemAuthEnabled()) return null;
  const token = (await cookies()).get(ECO_COOKIE)?.value;
  if (!token) return null;
  return verifyEcoSession(token);
}

function normalizeTg(username: string | null | undefined): string {
  return (username ?? "").replace(/^@+/, "").trim().toLowerCase();
}

export async function resolveUserFromEcoSession() {
  const session = await getEcoSession();
  if (!session) return null;

  const tg = normalizeTg(session.telegramUsername);
  if (tg) {
    const users = await prisma.user.findMany({ where: { isActive: true } });
    const match = users.find(u => normalizeTg(u.telegramUsername) === tg);
    if (match) return match;
  }

  if (session.isSuperAdmin) {
    const admin = await prisma.user.findFirst({
      where: { isActive: true, role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] } },
      orderBy: { createdAt: "asc" },
    });
    if (admin) return admin;

    const telegramId = session.telegramId || `eco-${session.userId}`;
    return prisma.user.upsert({
      where: { telegramId },
      create: {
        name: session.displayName || "Ecosystem Admin",
        telegramId,
        telegramUsername: tg || null,
        role: UserRole.SUPER_ADMIN,
        profileCompleted: true,
        isActive: true,
      },
      update: {
        isActive: true,
        profileCompleted: true,
        role: UserRole.SUPER_ADMIN,
      },
    });
  }

  return null;
}

export async function hasEcoSession(): Promise<boolean> {
  return (await getEcoSession()) != null;
}
