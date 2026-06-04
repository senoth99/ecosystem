import { generateAccessToken, revokeAccessToken } from "@/app/actions";
import { RoleBadge } from "@/components/RoleBadge";
import { UserForm } from "@/components/UserForm";
import { UserZoneAssignments } from "@/components/UserZoneAssignments";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { MULTI_ZONE_ENABLED } from "@/lib/multiZone";
import { catchDb } from "@/lib/dbBoundary";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const actor = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  const canAssignZones = MULTI_ZONE_ENABLED && actor.role === UserRole.SUPER_ADMIN;

  const wrapped = await catchDb("admin/users", () =>
    prisma.user.findMany({
      include: {
        accessTokens: true,
        zoneAssignments: { select: { zoneId: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  );
  if (!wrapped.ok) return <ServiceUnavailable scope="admin/users" />;

  const zonesWrapped = canAssignZones
    ? await catchDb("admin/users/zones", () =>
        prisma.zone.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, isActive: true }
        })
      )
    : { ok: true as const, data: [] };

  const users = wrapped.data;
  const zones = zonesWrapped.ok ? zonesWrapped.data : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Пользователи</h1>
      <UserForm />
      {users.map((u) => (
        <div key={u.id} className="card flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{u.name}</span>
            <RoleBadge role={u.role} />
            <form
              action={async () => {
                "use server";
                const link = await generateAccessToken(u.id);
                console.log(`Ссылка входа ${u.name}: ${link}`);
              }}
            >
              <button className="btn-secondary">Сгенерировать ссылку входа</button>
            </form>
            {u.accessTokens
              .filter((t) => t.isActive)
              .map((t) => (
                <form
                  key={t.id}
                  action={async () => {
                    "use server";
                    await revokeAccessToken(t.id);
                  }}
                >
                  <button className="btn-secondary">Отозвать токен</button>
                </form>
              ))}
          </div>
          {canAssignZones && u.role !== UserRole.SUPER_ADMIN ? (
            <UserZoneAssignments
              userId={u.id}
              userName={u.name}
              zones={zones}
              assignedZoneIds={u.zoneAssignments.map((a) => a.zoneId)}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
