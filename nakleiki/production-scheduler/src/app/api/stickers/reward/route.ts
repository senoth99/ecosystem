import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addAppDays, isBeforeAppDay, startOfAppDay } from "@/lib/utils";
import { notifyAdminRoleUsers } from "@/lib/notifyAdmins";
import { notifyUserAppAndTelegram } from "@/lib/notifyDispatch";

function stickerRequiredDays(): number {
  const raw = Number(process.env.STICKER_REQUIRED_DAYS ?? "30");
  return Number.isFinite(raw) && raw > 0 && raw < 366 ? Math.floor(raw) : 30;
}

function stickerMissLimit(): number {
  const raw = Number(process.env.STICKER_MISS_LIMIT ?? "2");
  return Number.isFinite(raw) && raw >= 0 && raw < 31 ? Math.floor(raw) : 2;
}

function computeEligibility(input: { applicationStatus: string; approvedAt: Date | null; daily: { reportDate: Date; status: string }[] }) {
  const requiredDays = stickerRequiredDays();
  const missLimit = stickerMissLimit();
  const approvedAtDay = input.approvedAt ? startOfAppDay(input.approvedAt) : null;
  const today = startOfAppDay(new Date());

  const approvedAfterStart = approvedAtDay
    ? input.daily.filter((r) => r.status === "APPROVED" && !isBeforeAppDay(r.reportDate, approvedAtDay))
    : [];
  const approvedCount = approvedAfterStart.length;

  let daysSinceStart = 0;
  if (approvedAtDay && !isBeforeAppDay(today, approvedAtDay)) {
    let d = approvedAtDay;
    while (!isBeforeAppDay(today, d)) {
      daysSinceStart += 1;
      d = addAppDays(d, 1);
      if (daysSinceStart > 400) break;
    }
  }
  const missesUsed = approvedAtDay ? Math.max(0, daysSinceStart - approvedCount) : 0;

  const eligible =
    input.applicationStatus === "APPROVED" && approvedAtDay != null && approvedCount >= requiredDays && missesUsed <= missLimit;

  return { eligible, approvedCount, requiredDays, missLimit, missesUsed };
}

const ClaimSchema = z.object({
  size: z.string().trim().min(1).max(32),
  address: z.string().trim().min(8).max(500),
  phone: z.string().trim().min(6).max(32),
  comment: z.string().trim().max(1000).optional()
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const app = await prisma.stickerApplication.findUnique({
    where: { userId: user.id },
    include: {
      rewardClaim: true,
      dailyReports: { select: { reportDate: true, status: true } }
    }
  });
  if (!app) return NextResponse.json({ application: null, eligible: false, claim: null });

  const elig = computeEligibility({
    applicationStatus: app.status,
    approvedAt: app.approvedAt,
    daily: app.dailyReports.map((r) => ({ reportDate: r.reportDate, status: r.status }))
  });

  return NextResponse.json({ applicationId: app.id, eligible: elig.eligible, claim: app.rewardClaim });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const app = await prisma.stickerApplication.findUnique({
    where: { userId: user.id },
    include: { dailyReports: { select: { reportDate: true, status: true } } }
  });
  if (!app) return NextResponse.json({ error: "no_application" }, { status: 409 });

  const elig = computeEligibility({
    applicationStatus: app.status,
    approvedAt: app.approvedAt,
    daily: app.dailyReports.map((r) => ({ reportDate: r.reportDate, status: r.status }))
  });
  if (!elig.eligible) return NextResponse.json({ error: "not_eligible" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload", details: parsed.error.flatten() }, { status: 400 });

  const claim = await prisma.stickerRewardClaim.upsert({
    where: { applicationId: app.id },
    update: {
      status: "PENDING",
      size: parsed.data.size,
      address: parsed.data.address,
      phone: parsed.data.phone,
      comment: parsed.data.comment ?? null
    },
    create: {
      applicationId: app.id,
      userId: user.id,
      status: "PENDING",
      size: parsed.data.size,
      address: parsed.data.address,
      phone: parsed.data.phone,
      comment: parsed.data.comment ?? null
    }
  });

  await notifyUserAppAndTelegram({
    userId: user.id,
    type: "STICKER_REWARD_CLAIM_CREATED",
    title: "Заявка на шмотку принята",
    body: "Мы получили данные на доставку. Менеджер скоро свяжется с вами, если нужно уточнение.",
    telegramText: "✅ Заявка на шмотку принята.\nМы получили данные на доставку."
  });

  await notifyAdminRoleUsers({
    type: "STICKER_REWARD_CLAIM_CREATED",
    title: "Новая заявка на шмотку",
    body: `${user.name}\napp:${app.id}\nsize:${claim.size}\nphone:${claim.phone}\naddress:${claim.address}`,
    telegramText: `🎁 Новая заявка на шмотку\n${user.name}\nsize: ${claim.size}\nphone: ${claim.phone}`
  });

  return NextResponse.json({ ok: true, claim });
}

