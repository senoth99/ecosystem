import { AdminRoleByTelegramUsernameForm } from "@/components/admin/AdminRoleByTelegramUsernameForm";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { catchDb } from "@/lib/dbBoundary";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  await requireRole([UserRole.SUPER_ADMIN]);
  const wrapped = await catchDb("admin/users", () =>
    prisma.allowedTelegramUser.findMany({ orderBy: { updatedAt: "desc" }, take: 300 })
  );
  if (!wrapped.ok) return <ServiceUnavailable scope="admin/users" />;
  const rows = wrapped.data;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Админы по Telegram</h1>
      <div className="space-y-2">
        <h2 className="ui-page-title">Выдать роль по Telegram username</h2>
        <AdminRoleByTelegramUsernameForm />
      </div>

      <div className="space-y-2">
        <h2 className="ui-page-title">Текущий список</h2>
        {rows.length === 0 ? (
          <div className="card text-sm text-muted">Пока пусто.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">@{r.username}</p>
                <p className="text-xs text-muted">role: {r.role} • active: {r.isActive ? "yes" : "no"}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-display text-muted">
                {r.updatedAt.toISOString().slice(0, 10)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
