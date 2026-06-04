import type { TgUser } from "./telegram.js";
import { displayName, normalizeUsername } from "./telegram.js";
import { prisma } from "./prisma.js";
import { superadminUsernames } from "./config.js";
import type { EcoSession } from "./session.js";

export async function upsertFromTelegram(tg: TgUser) {
  const username = normalizeUsername(tg);
  const configSuper = superadminUsernames().has(username);
  const existing = await prisma.user.findUnique({
    where: { telegramId: String(tg.id) }
  });

  const user = await prisma.user.upsert({
    where: { telegramId: String(tg.id) },
    create: {
      telegramId: String(tg.id),
      telegramUsername: username || null,
      displayName: displayName(tg),
      photoUrl: tg.photo_url ?? null,
      isSuperAdmin: configSuper,
      isActive: true
    },
    update: {
      telegramUsername: username || null,
      displayName: displayName(tg),
      photoUrl: tg.photo_url ?? null,
      ...(configSuper || existing?.isSuperAdmin ? { isSuperAdmin: true } : {}),
      isActive: true
    }
  });

  if (configSuper && !user.isSuperAdmin) {
    return prisma.user.update({
      where: { id: user.id },
      data: { isSuperAdmin: true }
    });
  }
  return user;
}

export async function canLogin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isActive) return false;
  if (user.isSuperAdmin) return true;
  const count = await prisma.appPermission.count({
    where: { userId, enabled: true }
  });
  return count > 0;
}

export function toSession(user: {
  id: string;
  telegramId: string;
  telegramUsername: string | null;
  displayName: string;
  isSuperAdmin: boolean;
}): EcoSession {
  return {
    userId: user.id,
    telegramId: user.telegramId,
    telegramUsername: (user.telegramUsername ?? "").toLowerCase(),
    displayName: user.displayName,
    isSuperAdmin: user.isSuperAdmin
  };
}

export async function getUserApps(userId: string, isSuperAdmin: boolean) {
  const apps = await prisma.ecosystemApp.findMany({ orderBy: { sortOrder: "asc" } });
  if (isSuperAdmin) {
    return apps.map((a) => ({
      slug: a.slug,
      title: a.title,
      path: a.path,
      enabled: true,
      canView: true,
      canManage: a.hasManage,
      extras: {}
    }));
  }
  const perms = await prisma.appPermission.findMany({ where: { userId } });
  const bySlug = new Map(perms.map((p) => [p.appSlug, p]));
  return apps
    .filter((a) => {
      const p = bySlug.get(a.slug);
      return p?.enabled && p.canView;
    })
    .map((a) => {
      const p = bySlug.get(a.slug)!;
      return {
        slug: a.slug,
        title: a.title,
        path: a.path,
        enabled: p.enabled,
        canView: p.canView,
        canManage: p.canManage,
        extras: (p.extras as Record<string, boolean>) ?? {}
      };
    });
}
