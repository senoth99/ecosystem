import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRoleApi } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { notifyUserAppAndTelegram } from "@/lib/notifyDispatch";
import { formatDateRu, safeParseISO } from "@/lib/utils";

const PatchSchema = z.object({
  id: z.string().cuid(),
  decision: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().trim().max(2000).optional()
});

function normalizeComment(decision: "APPROVE" | "REJECT", comment?: string) {
  const c = (comment ?? "").trim();
  if (c) return c;
  return decision === "APPROVE"
    ? "Принято. Отлично."
    : "Не принято. Переснимите так, чтобы наклейка была хорошо видна, и отправьте снова.";
}

export async function GET() {
  const auth = await requireRoleApi([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (!auth.ok) return auth.response;

  const items = await prisma.stickerDailyReport.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: {
      photos: true,
      application: { select: { id: true, plateNumber: true, status: true } },
      user: { select: { id: true, name: true, telegramUsername: true, telegramPhotoUrl: true } }
    },
    take: 500
  });
  return NextResponse.json({ items });
}

export async function PATCH(req: Request) {
  const auth = await requireRoleApi([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const { id, decision } = parsed.data;
  const comment = normalizeComment(decision, parsed.data.comment);
  const now = new Date();
  const nextStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";

  const updated = await prisma.stickerDailyReport.update({
    where: { id },
    data: {
      status: nextStatus,
      moderatorUserId: auth.user.id,
      moderatorComment: comment,
      reviewedAt: now
    },
    select: {
      id: true,
      userId: true,
      reportDate: true,
      application: { select: { plateNumber: true } }
    }
  });

  const dayStr = formatDateRu(safeParseISO(updated.reportDate.toISOString()), "dd.MM.yyyy");
  await notifyUserAppAndTelegram({
    userId: updated.userId,
    type: "STICKER_DAILY_REVIEWED",
    title: decision === "APPROVE" ? "Фото дня принято" : "Фото дня отклонено",
    body: `${updated.application.plateNumber}\n${dayStr}\n\n${comment}`,
    telegramText: `${decision === "APPROVE" ? "✅" : "❌"} ${
      decision === "APPROVE" ? "Фото дня принято" : "Фото дня отклонено"
    }\n${updated.application.plateNumber}\n${dayStr}\n\n${comment}`
  });

  return NextResponse.json({ ok: true });
}

