"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ecoFetch } from "@/lib/utils";
import type { AdminUser, EcosystemAppDef } from "@/lib/types";
import { PermissionsTable } from "@/components/PermissionsTable";
import { ArrowLeft, Save } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [apps, setApps] = useState<EcosystemAppDef[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [perms, setPerms] = useState<
    { appSlug: string; enabled: boolean; canView: boolean; canManage: boolean; extras: Record<string, boolean> }[]
  >([]);
  const [grantUsername, setGrantUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    ecoFetch("/me").then(async (res) => {
      if (res.status === 401) return router.replace("/login");
      const me = await res.json();
      if (!me.user?.isSuperAdmin) return router.replace("/");
    });
    ecoFetch("/admin/users").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    });
  }, [router]);

  const loadUser = async (id: string) => {
    setSelectedId(id);
    const res = await ecoFetch(`/admin/users/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setApps(
      (data.apps ?? []).map((a: EcosystemAppDef & { extraPerms: unknown }) => ({
        ...a,
        extraPerms: (a.extraPerms as EcosystemAppDef["extraPerms"]) ?? null
      }))
    );
    type Perm = AdminUser["permissions"][number];
    const bySlug = new Map<string, Perm>(
      (data.user.permissions ?? []).map((p: Perm) => [p.appSlug, p])
    );
    setPerms(
      (data.apps ?? []).map((a: { slug: string }) => {
        const p = bySlug.get(a.slug);
        return {
          appSlug: a.slug,
          enabled: p?.enabled ?? false,
          canView: p?.canView ?? false,
          canManage: p?.canManage ?? false,
          extras: (p?.extras as Record<string, boolean>) ?? {}
        };
      })
    );
  };

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    const res = await ecoFetch(`/admin/users/${selectedId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: perms })
    });
    setSaving(false);
    if (!res.ok) setError("Не удалось сохранить");
  };

  const grantByUsername = async () => {
    const res = await ecoFetch("/admin/users/grant-by-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: grantUsername })
    });
    if (res.ok) {
      const data = await res.json();
      setGrantUsername("");
      const list = await ecoFetch("/admin/users");
      setUsers((await list.json()).users ?? []);
      if (data.user?.id) loadUser(data.user.id);
    }
  };

  return (
    <div className="mx-auto min-h-[100dvh] max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="btn-secondary flex min-h-10 items-center gap-2 px-3">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="ui-page-title">Права доступа</h1>
      </div>

      <div className="mb-6 card flex flex-wrap gap-2">
        <input
          className="min-w-[200px] flex-1 border-b border-border bg-transparent py-2 text-sm outline-none"
          placeholder="@telegram username"
          value={grantUsername}
          onChange={(e) => setGrantUsername(e.target.value)}
        />
        <button type="button" className="btn-primary min-h-10 px-4" onClick={grantByUsername}>
          Добавить пользователя
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => loadUser(u.id)}
            className={`rounded-lg border px-3 py-2 text-xs uppercase tracking-display ${
              selectedId === u.id ? "border-foreground bg-foreground/10" : "border-border"
            }`}
          >
            {u.displayName}
            {u.isSuperAdmin ? " ★" : ""}
          </button>
        ))}
      </div>

      {selectedId && apps.length > 0 ? (
        <>
          <PermissionsTable apps={apps} value={perms} onChange={setPerms} />
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          <button type="button" className="btn-primary mt-4 flex items-center gap-2" disabled={saving} onClick={save}>
            <Save className="h-4 w-4" />
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">Выберите пользователя для настройки прав.</p>
      )}
    </div>
  );
}
