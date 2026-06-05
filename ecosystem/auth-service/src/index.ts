import express from "express";
import cors from "cors";
import { prisma } from "./prisma.js";
import {
  clearSessionCookieHeader,
  cookieContextFromRequest,
  parseCookie,
  sessionCookieHeader,
  signSession,
  verifySession
} from "./session.js";
import {
  displayName,
  hashToken,
  normalizeUsername,
  parseUserFromInitData,
  randomToken,
  verifyTelegramInitData,
  type TgUser
} from "./telegram.js";
import { superadminUsernames } from "./config.js";
import { canLogin, getUserApps, toSession, upsertFromTelegram } from "./users.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4001);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    credentials: true
  })
);
app.use(express.json());

function setSession(res: express.Response, token: string, req?: express.Request) {
  res.setHeader("Set-Cookie", sessionCookieHeader(token, cookieContextFromRequest(req)));
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/apps", async (_req, res) => {
  const apps = await prisma.ecosystemApp.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ apps });
});

app.get("/me", async (req, res) => {
  const token = parseCookie(req.headers.cookie);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const session = await verifySession(token);
  if (!session) return res.status(401).json({ error: "Invalid session" });
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.isActive) return res.status(401).json({ error: "Inactive" });
  const apps = await getUserApps(user.id, user.isSuperAdmin);
  res.json({ user: session, apps });
});

app.post("/auth/logout", (req, res) => {
  res.setHeader("Set-Cookie", clearSessionCookieHeader(cookieContextFromRequest(req)));
  res.json({ ok: true });
});

app.post("/auth/telegram", async (req, res) => {
  const initData = typeof req.body?.initData === "string" ? req.body.initData : "";
  if (!initData) return res.status(400).json({ error: "initData required" });
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) return res.status(503).json({ error: "TELEGRAM_BOT_TOKEN not set" });
  if (!verifyTelegramInitData(initData, botToken)) {
    return res.status(401).json({ error: "Invalid Telegram signature" });
  }
  const tg = parseUserFromInitData(initData);
  if (!tg) return res.status(400).json({ error: "Invalid user" });
  return finishTelegramLogin(req, res, tg);
});

app.post("/auth/telegram/dev", async (req, res) => {
  if (process.env.TELEGRAM_ALLOW_DEV_LOGIN !== "true") {
    return res.status(403).json({ error: "Dev login disabled" });
  }
  const id = Number(req.body?.telegramId ?? 100001);
  const tg: TgUser = {
    id,
    username: String(req.body?.username ?? "contact_voropaev").replace(/^@+/, ""),
    first_name: "Dev",
    last_name: "User"
  };
  return finishTelegramLogin(req, res, tg);
});

app.post("/auth/password", async (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const expected =
    typeof process.env.APP_PASSWORD === "string" && process.env.APP_PASSWORD.trim() !== ""
      ? process.env.APP_PASSWORD.trim()
      : "";
  if (!expected) return res.status(503).json({ error: "Вход по паролю не настроен" });
  if (password.trim() !== expected) return res.status(401).json({ error: "Неверный пароль" });
  const adminUsername = superadminUsernames().values().next().value ?? "contact_voropaev";
  const tg: TgUser = {
    id: 900_001,
    username: adminUsername,
    first_name: "Admin",
    last_name: ""
  };
  return finishTelegramLogin(req, res, tg);
});

async function finishTelegramLogin(req: express.Request, res: express.Response, tg: TgUser) {
  const user = await upsertFromTelegram(tg);
  if (!(await canLogin(user.id))) {
    return res.status(403).json({
      error: "Доступ не выдан. Обратитесь к администратору.",
      code: "ACCESS_DENIED"
    });
  }
  const token = await signSession(toSession(user));
  setSession(res, token, req);
  const apps = await getUserApps(user.id, user.isSuperAdmin);
  res.json({
    ok: true,
    user: toSession(user),
    apps,
    isSuperAdmin: user.isSuperAdmin
  });
}

app.post("/auth/browser/start", async (_req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  if (!botToken || !botUsername) {
    return res.status(503).json({ error: "Telegram bot not configured" });
  }
  const raw = randomToken();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.browserLoginChallenge.create({
    data: { tokenHash: hashToken(raw), expiresAt }
  });
  const openUrl = `https://t.me/${botUsername}?start=eco_${raw}`;
  res.json({ token: raw, openUrl, expiresInSec: 300, botUsername });
});

app.post("/auth/browser/complete", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  if (!token) return res.status(400).json({ error: "token required" });
  const challenge = await prisma.browserLoginChallenge.findUnique({
    where: { tokenHash: hashToken(token) }
  });
  if (!challenge || challenge.consumed || challenge.expiresAt < new Date()) {
    return res.json({ waiting: true });
  }
  if (!challenge.userId) return res.json({ waiting: true });
  const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
  if (!user) return res.json({ waiting: true });
  await prisma.browserLoginChallenge.update({
    where: { id: challenge.id },
    data: { consumed: true }
  });
  if (!(await canLogin(user.id))) {
    return res.status(403).json({ error: "Access denied", code: "ACCESS_DENIED" });
  }
  const jwt = await signSession(toSession(user));
  setSession(res, jwt, req);
  res.json({ ok: true, user: toSession(user) });
});

/** Webhook: /start eco_<token> completes browser login */
app.post("/telegram/webhook", async (req, res) => {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).json({ error: "Forbidden" });
  }
  const message = req.body?.message;
  const text: string = message?.text ?? "";
  const from = message?.from;
  if (!from?.id || !text.startsWith("/start")) {
    return res.json({ ok: true });
  }
  const payload = text.split(/\s+/)[1] ?? "";
  if (!payload.startsWith("eco_")) return res.json({ ok: true });
  const raw = payload.slice(4);
  const challenge = await prisma.browserLoginChallenge.findUnique({
    where: { tokenHash: hashToken(raw) }
  });
  if (!challenge || challenge.consumed || challenge.expiresAt < new Date()) {
    return res.json({ ok: true });
  }
  const tg: TgUser = {
    id: from.id,
    username: from.username,
    first_name: from.first_name,
    last_name: from.last_name
  };
  const user = await upsertFromTelegram(tg);
  await prisma.browserLoginChallenge.update({
    where: { id: challenge.id },
    data: { userId: user.id, consumed: false }
  });
  const botToken = process.env.TELEGRAM_BOT_TOKEN!.trim();
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: from.id,
      text: "Вход подтверждён. Вернитесь в браузер — страница обновится автоматически."
    })
  }).catch(() => {});
  res.json({ ok: true });
});

/** Admin: list users */
app.get("/admin/users", requireSuperAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { updatedAt: "desc" },
    include: { permissions: true }
  });
  res.json({ users });
});

app.get("/admin/users/:id", requireSuperAdmin, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { permissions: true }
  });
  if (!user) return res.status(404).json({ error: "Not found" });
  const apps = await prisma.ecosystemApp.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ user, apps });
});

app.put("/admin/users/:id/permissions", requireSuperAdmin, async (req, res) => {
  const userId = req.params.id;
  const rows = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
  for (const row of rows) {
    if (!row?.appSlug) continue;
    await prisma.appPermission.upsert({
      where: { userId_appSlug: { userId, appSlug: row.appSlug } },
      create: {
        userId,
        appSlug: row.appSlug,
        enabled: Boolean(row.enabled),
        canView: Boolean(row.canView),
        canManage: Boolean(row.canManage),
        extras: row.extras ?? {}
      },
      update: {
        enabled: Boolean(row.enabled),
        canView: Boolean(row.canView),
        canManage: Boolean(row.canManage),
        extras: row.extras ?? {}
      }
    });
  }
  res.json({ ok: true });
});

app.post("/admin/users/grant-by-username", requireSuperAdmin, async (req, res) => {
  const username = String(req.body?.username ?? "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
  if (!username) return res.status(400).json({ error: "username required" });
  let user = await prisma.user.findFirst({
    where: { telegramUsername: username }
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId: `pending_${username}`,
        telegramUsername: username,
        displayName: `@${username}`,
        isActive: true,
        isSuperAdmin: superadminUsernames().has(username)
      }
    });
  }
  const apps = await prisma.ecosystemApp.findMany();
  for (const a of apps) {
    await prisma.appPermission.upsert({
      where: { userId_appSlug: { userId: user.id, appSlug: a.slug } },
      create: {
        userId: user.id,
        appSlug: a.slug,
        enabled: true,
        canView: true,
        canManage: a.hasManage
      },
      update: { enabled: true, canView: true, canManage: a.hasManage }
    });
  }
  res.json({ ok: true, user });
});

type AuthedReq = express.Request & { ecoSession?: Awaited<ReturnType<typeof verifySession>> };

async function requireSuperAdmin(
  req: AuthedReq,
  res: express.Response,
  next: express.NextFunction
) {
  const token = parseCookie(req.headers.cookie);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const session = await verifySession(token);
  if (!session?.isSuperAdmin) return res.status(403).json({ error: "Forbidden" });
  req.ecoSession = session;
  next();
}

/** Verify session for other microservices */
app.get("/verify", async (req, res) => {
  const token =
    parseCookie(req.headers.cookie) ??
    (typeof req.headers.authorization === "string"
      ? req.headers.authorization.replace(/^Bearer\s+/i, "")
      : null);
  if (!token) return res.status(401).json({ valid: false });
  const session = await verifySession(token);
  if (!session) return res.status(401).json({ valid: false });
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { permissions: true }
  });
  if (!user?.isActive) return res.status(401).json({ valid: false });
  const appSlug = typeof req.query.app === "string" ? req.query.app : "";
  if (appSlug && !user.isSuperAdmin) {
    const perm = user.permissions.find((p) => p.appSlug === appSlug);
    if (!perm?.enabled || !perm.canView) {
      return res.status(403).json({ valid: false, reason: "no_app_access" });
    }
    return res.json({
      valid: true,
      session,
      permission: {
        canView: perm.canView,
        canManage: perm.canManage,
        extras: perm.extras
      }
    });
  }
  res.json({ valid: true, session, isSuperAdmin: user.isSuperAdmin });
});

app.listen(PORT, () => {
  console.log(`auth-service listening on ${PORT}`);
});
