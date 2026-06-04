"use server";

import { revalidatePath } from "next/cache";
import {
  hashToken,
  generateRawToken,
  getCurrentUser,
  refreshSessionCookieForUserId,
  requireAuth,
  requireRole
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userSchema } from "@/lib/validation";
import { resolveAppPublicBaseUrl } from "@/lib/appUrl";
import { writeAuditLog } from "@/lib/audit";
import { UserRole } from "@/lib/enums";
import { z } from "zod";

function normalizedTelegramSuperAdminUsername(): string {
  return (process.env.TELEGRAM_ADMIN_USERNAME ?? "").trim().toLowerCase().replace(/^@/, "");
}

async function requireSuperAdminOrManagerForTelegramAccess() {
  const actor = await requireAuth();
  if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) throw new Error("Недостаточно прав.");
  return { actor, isSuper: actor.role === UserRole.SUPER_ADMIN };
}

export async function createUser(input: unknown) {
  const actor = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  const data = userSchema.parse(input);
  if (data.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
    throw new Error("Только суперадмин может создать пользователя с ролью SUPER_ADMIN.");
  }
  if (data.role === UserRole.SUPER_ADMIN) {
    const existingSuperAdmin = await prisma.user.findFirst({ where: { role: UserRole.SUPER_ADMIN } });
    if (existingSuperAdmin) throw new Error("Суперадмин может быть только один.");
  }
  const user = await prisma.user.create({ data });
  await writeAuditLog({ actorUserId: actor.id, action: "CREATE_USER", entityType: "User", entityId: user.id, payload: data });
  revalidatePath("/admin/users");
}

export async function updateUser(id: string, input: unknown) {
  const actor = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new Error("Пользователь не найден.");
  const data = userSchema.partial().parse(input);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    if (target.role === UserRole.SUPER_ADMIN) {
      throw new Error("Изменять суперадмина может только суперадмин.");
    }
    if (data.role === UserRole.SUPER_ADMIN) {
      throw new Error("Назначать роль SUPER_ADMIN может только суперадмин.");
    }
  }
  if (data.role === UserRole.SUPER_ADMIN) {
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN, id: { not: id } }
    });
    if (existingSuperAdmin) throw new Error("Суперадмин может быть только один.");
  }
  const user = await prisma.user.update({ where: { id }, data });
  await writeAuditLog({ actorUserId: actor.id, action: "UPDATE_USER", entityType: "User", entityId: id, payload: data });
  revalidatePath("/admin/users");
  return user;
}

export async function generateAccessToken(userId: string) {
  const actor = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  await prisma.accessToken.create({ data: { userId, tokenHash } });
  await writeAuditLog({ actorUserId: actor.id, action: "ISSUE_ACCESS_TOKEN", entityType: "AccessToken", entityId: userId });
  return `${resolveAppPublicBaseUrl()}/login/token/${raw}`;
}

export async function revokeAccessToken(id: string) {
  const actor = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  await prisma.accessToken.update({ where: { id }, data: { isActive: false, revokedAt: new Date() } });
  await writeAuditLog({ actorUserId: actor.id, action: "REVOKE_ACCESS_TOKEN", entityType: "AccessToken", entityId: id });
}

export async function updateMyProfile(input: unknown) {
  const user = await requireAuth();
  const schema = z.object({
    firstName: z.string().trim().min(2, "Имя минимум 2 символа"),
    lastName: z.string().trim().min(2, "Фамилия минимум 2 символа")
  });
  const data = schema.parse(input);
  const displayName = `${data.lastName} ${data.firstName}`.trim();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      name: displayName,
      profileCompleted: true
    }
  });
  await refreshSessionCookieForUserId(user.id);
  revalidatePath("/me");
}

export async function completeWelcomeProfile(input: unknown) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Нужна авторизация");
  const schema = z.object({
    firstName: z.string().trim().min(2, "Имя минимум 2 символа"),
    lastName: z.string().trim().min(2, "Фамилия минимум 2 символа")
  });
  const data = schema.parse(input);
  const displayName = `${data.lastName} ${data.firstName}`.trim();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      name: displayName,
      profileCompleted: true
    }
  });
  await refreshSessionCookieForUserId(user.id);
  revalidatePath("/welcome");
  revalidatePath("/stickers");
  revalidatePath("/me");
}

export async function addAllowedTelegramUser(input: unknown) {
  const { actor, isSuper } = await requireSuperAdminOrManagerForTelegramAccess();
  const schema = z.object({
    username: z
      .string()
      .trim()
      .min(3, "username слишком короткий")
      .toLowerCase()
      .transform((v) => v.replace(/^@/, "")),
    isManager: z.boolean().optional().default(false)
  });
  const data = schema.parse(input);
  const superAdminUsername = normalizedTelegramSuperAdminUsername();
  if (!isSuper && superAdminUsername && data.username === superAdminUsername) {
    throw new Error("Этот логин недоступен для добавления из панели сотрудников.");
  }
  const role =
    isSuper && superAdminUsername && data.username === superAdminUsername ? UserRole.SUPER_ADMIN : UserRole.EMPLOYEE;
  const managerFlag = role === UserRole.SUPER_ADMIN ? false : Boolean(data.isManager);
  if (role === UserRole.SUPER_ADMIN) {
    const existingSuperAdmin = await prisma.allowedTelegramUser.findFirst({
      where: { role: UserRole.SUPER_ADMIN, username: { not: data.username } }
    });
    if (existingSuperAdmin) throw new Error("Суперадмин может быть только один.");
  }
  const usersForMatch = await prisma.user.findMany({
    where: { telegramUsername: { not: null } },
    select: { id: true, telegramId: true, telegramUsername: true }
  });
  const matchUser = usersForMatch.find((u) => (u.telegramUsername ?? "").toLowerCase() === data.username);

  const row = await prisma.allowedTelegramUser.upsert({
    where: { username: data.username },
    update: {
      role,
      isActive: true,
      isManager: managerFlag,
      ...(matchUser?.telegramId ? { telegramId: matchUser.telegramId } : {})
    },
    create: {
      username: data.username,
      role,
      isActive: true,
      isManager: managerFlag,
      telegramId: matchUser?.telegramId ?? null
    }
  });
  await prisma.user.updateMany({
    where: { telegramUsername: data.username, role: { not: UserRole.SUPER_ADMIN } },
    data: { isActive: true }
  });
  const userIdsToFlag = usersForMatch
    .filter((u) => (u.telegramUsername ?? "").toLowerCase() === data.username)
    .map((u) => u.id);
  if (userIdsToFlag.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: userIdsToFlag } },
      data: { isManager: managerFlag }
    });
  }
  await writeAuditLog({
    actorUserId: actor.id,
    action: "ALLOW_TELEGRAM_USER",
    entityType: "AllowedTelegramUser",
    entityId: row.id,
    payload: { ...data, role, isManager: managerFlag }
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function adminSetTelegramUserManager(input: unknown) {
  const { actor, isSuper } = await requireSuperAdminOrManagerForTelegramAccess();
  const schema = z.object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .transform((v) => v.replace(/^@/, "")),
    isManager: z.boolean()
  });
  const data = schema.parse(input);
  const superAdminUsername = normalizedTelegramSuperAdminUsername();
  if (data.username === superAdminUsername) throw new Error("Флаг не нужен для суперадмина.");
  const allow = await prisma.allowedTelegramUser.findFirst({
    where: { username: data.username }
  });
  if (!allow) throw new Error("Запись доступа для этого username не найдена — добавьте пользователя снова.");
  if (!isSuper && allow.role !== UserRole.EMPLOYEE) {
    throw new Error("Недостаточно прав.");
  }
  await prisma.allowedTelegramUser.updateMany({
    where: { username: data.username },
    data: { isManager: data.isManager }
  });
  await prisma.user.updateMany({
    where: { telegramUsername: data.username },
    data: { isManager: data.isManager }
  });
  await writeAuditLog({
    actorUserId: actor.id,
    action: data.isManager ? "SET_MANAGER" : "UNSET_MANAGER",
    entityType: "AllowedTelegramUser",
    entityId: data.username,
    payload: data
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function adminSetRoleByTelegramUsername(input: unknown) {
  const actor = await requireRole([UserRole.SUPER_ADMIN]);
  const schema = z.object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .transform((v) => v.replace(/^@/, "")),
    role: z.enum([UserRole.ADMIN, UserRole.EMPLOYEE])
  });
  const data = schema.parse(input);
  if (!data.username) throw new Error("Введите username");

  await prisma.$transaction(async (tx) => {
    await tx.allowedTelegramUser.upsert({
      where: { username: data.username },
      update: { role: data.role, isActive: true },
      create: { username: data.username, role: data.role, isActive: true, isManager: false }
    });
    await tx.user.updateMany({
      where: { telegramUsername: data.username },
      data: { role: data.role, isActive: true }
    });
  });

  await writeAuditLog({
    actorUserId: actor.id,
    action: "ADMIN_SET_ROLE_BY_TELEGRAM_USERNAME",
    entityType: "AllowedTelegramUser",
    entityId: data.username,
    payload: data
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function toggleAllowedTelegramUser(id: string, active: boolean) {
  const actor = await requireRole([UserRole.SUPER_ADMIN]);
  await prisma.allowedTelegramUser.update({
    where: { id },
    data: active ? { isActive: true } : { isActive: false, telegramId: null }
  });
  await writeAuditLog({
    actorUserId: actor.id,
    action: active ? "ENABLE_TELEGRAM_USER" : "DISABLE_TELEGRAM_USER",
    entityType: "AllowedTelegramUser",
    entityId: id
  });
  revalidatePath("/admin/users");
}

export async function adminUpdateUserProfile(input: unknown) {
  const { actor, isSuper } = await requireSuperAdminOrManagerForTelegramAccess();
  const schema = z.object({
    userId: z.string().cuid(),
    firstName: z.string().trim().min(2, "Имя минимум 2 символа"),
    lastName: z.string().trim().min(2, "Фамилия минимум 2 символа")
  });
  const data = schema.parse(input);
  if (!isSuper) {
    const target = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { role: true }
    });
    if (!target || target.role !== UserRole.EMPLOYEE) {
      throw new Error("Можно редактировать только профили сотрудников.");
    }
  }
  const name = `${data.lastName} ${data.firstName}`.trim();
  await prisma.user.update({
    where: { id: data.userId },
    data: { firstName: data.firstName, lastName: data.lastName, name }
  });
  await writeAuditLog({
    actorUserId: actor.id,
    action: "ADMIN_UPDATE_USER_PROFILE",
    entityType: "User",
    entityId: data.userId,
    payload: data
  });
  revalidatePath("/admin/users");
}

export async function revokeTelegramAccessByUsername(usernameInput: string) {
  const { actor, isSuper } = await requireSuperAdminOrManagerForTelegramAccess();
  const username = usernameInput.trim().toLowerCase().replace(/^@/, "");
  const superAdminUsername = normalizedTelegramSuperAdminUsername();
  if (username === superAdminUsername) throw new Error("Нельзя отзывать доступ у суперадмина.");
  if (!isSuper) {
    const allow = await prisma.allowedTelegramUser.findFirst({ where: { username } });
    if (!allow || allow.role !== UserRole.EMPLOYEE) {
      throw new Error("Отозвать можно только доступ сотрудника.");
    }
  }
  await prisma.allowedTelegramUser.updateMany({
    where: { username },
    data: { isActive: false, telegramId: null }
  });
  await prisma.user.updateMany({
    where: { telegramUsername: username, role: { not: UserRole.SUPER_ADMIN } },
    data: { isActive: false }
  });
  await writeAuditLog({
    actorUserId: actor.id,
    action: "REVOKE_TELEGRAM_ACCESS_BY_USERNAME",
    entityType: "AllowedTelegramUser",
    entityId: username
  });
  revalidatePath("/admin/users");
}

export async function deleteEmployeeByUsername(usernameInput: string) {
  const { actor, isSuper } = await requireSuperAdminOrManagerForTelegramAccess();
  const username = usernameInput.trim().toLowerCase().replace(/^@/, "");
  const superAdminUsername = normalizedTelegramSuperAdminUsername();
  if (username === superAdminUsername) throw new Error("Суперадмина нельзя удалить.");

  const allow = await prisma.allowedTelegramUser.findFirst({ where: { username } });
  if (!isSuper && allow && allow.role !== UserRole.EMPLOYEE) {
    throw new Error("Удалить можно только сотрудника.");
  }

  const candidates = await prisma.user.findMany({
    where: { telegramUsername: { not: null } },
    select: { id: true, role: true, telegramUsername: true }
  });
  const targets = candidates.filter((u) => (u.telegramUsername ?? "").toLowerCase() === username);
  if (targets.some((u) => u.role === UserRole.SUPER_ADMIN)) throw new Error("Суперадмина нельзя удалить.");
  if (!isSuper && targets.some((u) => u.role !== UserRole.EMPLOYEE)) {
    throw new Error("Удалить можно только сотрудника.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.allowedTelegramUser.deleteMany({ where: { username } });
    if (targets.length > 0) {
      await tx.user.deleteMany({
        where: { id: { in: targets.map((t) => t.id) }, role: { not: UserRole.SUPER_ADMIN } }
      });
    }
  });

  await writeAuditLog({
    actorUserId: actor.id,
    action: "DELETE_EMPLOYEE_BY_USERNAME",
    entityType: "User",
    entityId: username
  });
  revalidatePath("/admin/users");
}
