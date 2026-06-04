import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { catchDb } from "@/lib/dbBoundary";
import { prisma } from "@/lib/prisma";
import { AdminStickerQueuesClient } from "@/components/stickers/AdminStickerQueuesClient";

export default async function AdminStickersPage() {
  await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  const wrapped = await catchDb("admin/stickers", async () => {
    const [applications, dailyReports] = await Promise.all([
      prisma.stickerApplication.findMany({
        where: { status: "PENDING_REVIEW" },
        orderBy: { createdAt: "asc" },
        include: {
          photos: true,
          user: {
            select: {
              id: true,
              name: true,
              telegramUsername: true,
              telegramPhotoUrl: true
            }
          }
        },
        take: 200
      }),
      prisma.stickerDailyReport.findMany({
        where: { status: "PENDING_REVIEW" },
        orderBy: { createdAt: "asc" },
        include: {
          photos: true,
          application: {
            select: { id: true, plateNumber: true, status: true }
          },
          user: {
            select: {
              id: true,
              name: true,
              telegramUsername: true,
              telegramPhotoUrl: true
            }
          }
        },
        take: 300
      })
    ]);
    return {
      applications: applications.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString()
      })),
      dailyReports: dailyReports.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        reportDate: d.reportDate.toISOString()
      }))
    };
  });

  if (!wrapped.ok) return <ServiceUnavailable scope="admin/stickers" />;

  return <AdminStickerQueuesClient initial={wrapped.data} />;
}

