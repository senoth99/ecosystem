import { readFile, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  StickerDailyPhotoKind
} from "@/lib/stickerPhotos";
import {
  getDailyPhotoApiPath,
  getDailyPhotoDiskPath,
  resolveDailyPhotoDiskPath
} from "@/lib/stickerPhotos.server";

const MAX_BYTES = 4 * 1024 * 1024;

const GetSchema = z.object({
  reportId: z.string().cuid(),
  kind: z.enum([StickerDailyPhotoKind.MAIN, StickerDailyPhotoKind.CONTEXT])
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const url = new URL(req.url);
  const parsed = GetSchema.safeParse({
    reportId: url.searchParams.get("reportId"),
    kind: url.searchParams.get("kind")
  });
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const report = await prisma.stickerDailyReport.findUnique({
    where: { id: parsed.data.reportId },
    select: { userId: true }
  });
  if (!report) return new NextResponse(null, { status: 404 });

  const canView = report.userId === user.id || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (!canView) return new NextResponse(null, { status: 403 });

  const diskPath = resolveDailyPhotoDiskPath(parsed.data.reportId, parsed.data.kind);
  if (!diskPath) return new NextResponse(null, { status: 404 });

  const buf = await readFile(diskPath);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600"
    }
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const reportId = form.get("reportId");
  const kind = form.get("kind");
  const file = form.get("file");
  const parsed = GetSchema.safeParse({ reportId, kind });
  if (!parsed.success) return NextResponse.json({ error: "invalid_params" }, { status: 400 });

  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "file_required" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });

  const report = await prisma.stickerDailyReport.findUnique({
    where: { id: parsed.data.reportId },
    select: { id: true, userId: true, status: true, application: { select: { status: true } } }
  });
  if (!report) return NextResponse.json({ error: "report_not_found" }, { status: 404 });
  if (report.userId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (report.application.status !== "APPROVED") return NextResponse.json({ error: "application_not_approved" }, { status: 403 });
  if (report.status === "APPROVED") return NextResponse.json({ error: "report_locked" }, { status: 409 });

  const absPath = getDailyPhotoDiskPath(parsed.data.reportId, parsed.data.kind);
  await writeFile(absPath, buffer);

  await prisma.stickerDailyPhoto.upsert({
    where: { reportId_kind: { reportId: parsed.data.reportId, kind: parsed.data.kind } },
    update: { path: getDailyPhotoApiPath(parsed.data.reportId, parsed.data.kind) },
    create: {
      reportId: parsed.data.reportId,
      kind: parsed.data.kind,
      path: getDailyPhotoApiPath(parsed.data.reportId, parsed.data.kind)
    }
  });

  return NextResponse.json({ path: getDailyPhotoApiPath(parsed.data.reportId, parsed.data.kind) });
}

