import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRoleApi } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { notifyUserAppAndTelegram } from "@/lib/notifyDispatch";

const PatchSchema = z.object({
  id: z.string().cuid(),
  decision: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().trim().max(2000).optional()
});

function normalizeComment(decision: "APPROVE" | "REJECT", comment?: string) {
  const c = (comment ?? "").trim();
  if (c) return c;
  return decision === "APPROVE"
    ? "Одобрено. Спасибо! Можно отправлять ежедневные фото."
    : "Отклонено. Проверьте требования к наклейке и перезагрузите фото.";
}

export async function GET() {
  const auth = await requireRoleApi([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (!auth.ok) return auth.response;

  const items = await prisma.stickerApplication.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: {
      photos: true,
      user: { select: { id: true, name: true, telegramUsername: true, telegramPhotoUrl: true } }
    },
    take: 300
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

  const updated = await prisma.stickerApplication.update({
    where: { id },
    data: {
      status: nextStatus,
      moderatorUserId: auth.user.id,
      moderatorComment: comment,
      reviewedAt: now,
      ...(decision === "APPROVE"
        ? { approvedAt: now, rejectedAt: null }
        : { rejectedAt: now, approvedAt: null })
    },
    select: { id: true, userId: true, fullName: true, plateNumber: true, status: true }
  });

  await notifyUserAppAndTelegram({
    userId: updated.userId,
    type: "STICKER_APPLICATION_REVIEWED",
    title: decision === "APPROVE" ? "Заявка одобрена" : "Заявка отклонена",
    body: `${updated.plateNumber}\n\n${comment}`,
    telegramText: `${decision === "APPROVE" ? "✅" : "❌"} ${decision === "APPROVE" ? "Заявка одобрена" : "Заявка отклонена"}\n${updated.plateNumber}\n\n${comment}`
  });

  return NextResponse.json({ ok: true });
}

