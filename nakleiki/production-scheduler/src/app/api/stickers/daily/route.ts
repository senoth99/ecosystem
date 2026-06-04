import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addAppDays, isBeforeAppDay, startOfAppDay } from "@/lib/utils";

function stickerRequiredDays(): number {
  const raw = Number(process.env.STICKER_REQUIRED_DAYS ?? "30");
  return Number.isFinite(raw) && raw > 0 && raw < 366 ? Math.floor(raw) : 30;
}

function stickerMissLimit(): number {
  const raw = Number(process.env.STICKER_MISS_LIMIT ?? "2");
  return Number.isFinite(raw) && raw >= 0 && raw < 31 ? Math.floor(raw) : 2;
}

function computeStats(input: {
  applicationStatus: string;
  approvedAt: Date | null;
  dailyReports: { reportDate: Date; status: string }[];
}) {
  const requiredDays = stickerRequiredDays();
  const missLimit = stickerMissLimit();
  const approvedAtDay = input.approvedAt ? startOfAppDay(input.approvedAt) : null;
  const today = startOfAppDay(new Date());

  const approvedAfterStart = approvedAtDay
    ? input.dailyReports.filter((r) => r.status === "APPROVED" && !isBeforeAppDay(r.reportDate, approvedAtDay))
    : [];
  const approvedCount = approvedAfterStart.length;

  let daysSinceStart = 0;
  if (approvedAtDay && !isBeforeAppDay(today, approvedAtDay)) {
    // inclusive count: day1 = approvedAtDay
    // compute by stepping days (small, max 366)
    let d = approvedAtDay;
    while (!isBeforeAppDay(today, d)) {
      daysSinceStart += 1;
      d = addAppDays(d, 1);
      if (daysSinceStart > 400) break;
    }
  }

  const missesUsed = approvedAtDay ? Math.max(0, daysSinceStart - approvedCount) : 0;
  const missesLeft = approvedAtDay ? Math.max(0, missLimit - missesUsed) : missLimit;

  const eligibleForReward =
    input.applicationStatus === "APPROVED" && approvedAtDay != null && approvedCount >= requiredDays && missesUsed <= missLimit;

  return {
    requiredDays,
    missLimit,
    approvedCount,
    daysSinceStart,
    missesUsed,
    missesLeft,
    eligibleForReward
  };
}

const CreateSchema = z.object({
  /** если нужно не "сегодня" (на будущее), но пока оставим */
  dateIso: z.string().optional()
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const app = await prisma.stickerApplication.findUnique({
    where: { userId: user.id },
    include: {
      photos: true,
      dailyReports: { orderBy: { reportDate: "desc" }, take: 60, include: { photos: true } }
    }
  });
  if (!app) return NextResponse.json({ application: null, stats: null });

  const stats = computeStats({
    applicationStatus: app.status,
    approvedAt: app.approvedAt,
    dailyReports: app.dailyReports.map((r) => ({ reportDate: r.reportDate, status: r.status }))
  });

  return NextResponse.json({ application: app, stats });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const app = await prisma.stickerApplication.findUnique({ where: { userId: user.id } });
  if (!app) return NextResponse.json({ error: "no_application" }, { status: 409 });
  if (app.status !== "APPROVED") return NextResponse.json({ error: "application_not_approved" }, { status: 403 });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const targetDate = startOfAppDay(parsed.data.dateIso ? new Date(parsed.data.dateIso) : new Date());

  const report = await prisma.stickerDailyReport.upsert({
    where: { applicationId_reportDate: { applicationId: app.id, reportDate: targetDate } },
    update: {},
    create: {
      applicationId: app.id,
      userId: user.id,
      reportDate: targetDate,
      status: "PENDING_REVIEW",
      moderatorComment: ""
    },
    include: { photos: true }
  });

  return NextResponse.json({ report });
}

