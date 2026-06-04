import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  applicationHasAllPhotos,
  canEditApplicationStatus,
  StickerApplicationStatus
} from "@/lib/stickerApplicationStatus";

const stickerApplicationInclude = {
  photos: true,
  dailyReports: { orderBy: { reportDate: "desc" as const }, take: 5 }
} satisfies Prisma.StickerApplicationInclude;

type StickerApplicationLoaded = Prisma.StickerApplicationGetPayload<{
  include: typeof stickerApplicationInclude;
}>;

const CreateOrUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  plateNumber: z.string().trim().min(3).max(32),
  submit: z.boolean().optional()
});

async function normalizeLegacyApplication(
  application: StickerApplicationLoaded | null
): Promise<StickerApplicationLoaded | null> {
  if (!application) return null;
  if (application.status !== StickerApplicationStatus.PENDING_REVIEW || application.submittedAt) {
    return application;
  }
  return prisma.stickerApplication.update({
    where: { id: application.id },
    data: { status: StickerApplicationStatus.DRAFT },
    include: stickerApplicationInclude
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let application = await prisma.stickerApplication.findUnique({
    where: { userId: user.id },
    include: stickerApplicationInclude
  });
  application = await normalizeLegacyApplication(application);
  return NextResponse.json({ application });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = CreateOrUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.stickerApplication.findUnique({
    where: { userId: user.id },
    include: { photos: true }
  });

  if (existing && !canEditApplicationStatus(existing.status)) {
    return NextResponse.json({ error: "cannot_edit_after_approved" }, { status: 409 });
  }

  const submit = parsed.data.submit === true;

  if (submit) {
    if (!existing) {
      return NextResponse.json({ error: "application_incomplete" }, { status: 400 });
    }
    if (!applicationHasAllPhotos(existing.photos)) {
      return NextResponse.json({ error: "photos_incomplete" }, { status: 400 });
    }
  }

  const now = new Date();

  const application = await prisma.stickerApplication.upsert({
    where: { userId: user.id },
    update: {
      fullName: parsed.data.fullName,
      plateNumber: parsed.data.plateNumber,
      ...(submit
        ? {
            status: StickerApplicationStatus.PENDING_REVIEW,
            submittedAt: now,
            moderatorUserId: null,
            moderatorComment: "",
            reviewedAt: null,
            approvedAt: null,
            rejectedAt: null
          }
        : {
            status:
              existing?.status === StickerApplicationStatus.REJECTED
                ? StickerApplicationStatus.REJECTED
                : existing?.status === StickerApplicationStatus.PENDING_REVIEW && existing.submittedAt
                  ? StickerApplicationStatus.PENDING_REVIEW
                  : StickerApplicationStatus.DRAFT
          })
    },
    create: {
      userId: user.id,
      fullName: parsed.data.fullName,
      plateNumber: parsed.data.plateNumber,
      status: submit ? StickerApplicationStatus.PENDING_REVIEW : StickerApplicationStatus.DRAFT,
      submittedAt: submit ? now : null,
      moderatorComment: ""
    },
    include: stickerApplicationInclude
  });

  return NextResponse.json({ application });
}
