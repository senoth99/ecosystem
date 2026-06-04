import { readFile, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  StickerApplicationPhotoKind
} from "@/lib/stickerPhotos";
import {
  getApplicationPhotoApiPath,
  getApplicationPhotoDiskPath,
  resolveApplicationPhotoDiskPath
} from "@/lib/stickerPhotos.server";

const MAX_BYTES = 4 * 1024 * 1024;

const GetSchema = z.object({
  applicationId: z.string().cuid(),
  kind: z.enum([
    StickerApplicationPhotoKind.FRONT,
    StickerApplicationPhotoKind.BACK,
    StickerApplicationPhotoKind.LEFT,
    StickerApplicationPhotoKind.RIGHT
  ])
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const url = new URL(req.url);
  const parsed = GetSchema.safeParse({
    applicationId: url.searchParams.get("applicationId"),
    kind: url.searchParams.get("kind")
  });
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const application = await prisma.stickerApplication.findUnique({
    where: { id: parsed.data.applicationId },
    select: { userId: true }
  });
  if (!application) return new NextResponse(null, { status: 404 });

  const canView = application.userId === user.id || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (!canView) return new NextResponse(null, { status: 403 });

  const diskPath = resolveApplicationPhotoDiskPath(parsed.data.applicationId, parsed.data.kind);
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

  const applicationId = form.get("applicationId");
  const kind = form.get("kind");
  const file = form.get("file");

  const parsed = GetSchema.safeParse({ applicationId, kind });
  if (!parsed.success) return NextResponse.json({ error: "invalid_params" }, { status: 400 });

  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });

  const application = await prisma.stickerApplication.findUnique({
    where: { id: parsed.data.applicationId },
    select: { id: true, userId: true, status: true }
  });
  if (!application) return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  if (application.userId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (application.status === "APPROVED") return NextResponse.json({ error: "application_locked" }, { status: 409 });

  const absPath = getApplicationPhotoDiskPath(parsed.data.applicationId, parsed.data.kind);
  await writeFile(absPath, buffer);

  await prisma.stickerApplicationPhoto.upsert({
    where: {
      applicationId_kind: { applicationId: parsed.data.applicationId, kind: parsed.data.kind }
    },
    update: {
      path: getApplicationPhotoApiPath(parsed.data.applicationId, parsed.data.kind)
    },
    create: {
      applicationId: parsed.data.applicationId,
      kind: parsed.data.kind,
      path: getApplicationPhotoApiPath(parsed.data.applicationId, parsed.data.kind)
    }
  });

  return NextResponse.json({ path: getApplicationPhotoApiPath(parsed.data.applicationId, parsed.data.kind) });
}

