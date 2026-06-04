"use client";

import type { AdminUser, EcosystemAppDef } from "@/lib/types";

type PermRow = {
  appSlug: string;
  enabled: boolean;
  canView: boolean;
  canManage: boolean;
  extras: Record<string, boolean>;
};

export function PermissionsTable({
  apps,
  value,
  onChange
}: {
  apps: EcosystemAppDef[];
  value: PermRow[];
  onChange: (rows: PermRow[]) => void;
}) {
  const get = (slug: string) => value.find((r) => r.appSlug === slug);

  const patch = (slug: string, patch: Partial<PermRow>) => {
    const existing = get(slug);
    const base: PermRow = existing ?? {
      appSlug: slug,
      enabled: false,
      canView: false,
      canManage: false,
      extras: {}
    };
    const next = { ...base, ...patch };
    if (!next.enabled) {
      next.canView = false;
      next.canManage = false;
    } else if (next.enabled && !next.canView && !next.canManage) {
      next.canView = true;
    }
    onChange([
      ...value.filter((r) => r.appSlug !== slug),
      next
    ]);
  };

  const patchExtra = (slug: string, key: string, on: boolean) => {
    const row = get(slug) ?? {
      appSlug: slug,
      enabled: true,
      canView: true,
      canManage: false,
      extras: {}
    };
    patch(slug, { extras: { ...row.extras, [key]: on } });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-card text-[10px] uppercase tracking-display text-muted">
            <th className="px-3 py-3 font-semibold">Раздел</th>
            <th className="px-3 py-3 font-semibold text-center">Доступ</th>
            <th className="px-3 py-3 font-semibold text-center">Просмотр</th>
            <th className="px-3 py-3 font-semibold text-center">Управление</th>
            <th className="px-3 py-3 font-semibold">Дополнительно</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => {
            const row = get(app.slug);
            const enabled = row?.enabled ?? false;
            const extras = (app.extraPerms as { key: string; label: string }[] | null) ?? [];
            return (
              <tr key={app.slug} className="border-b border-border/60">
                <td className="px-3 py-3 font-medium">{app.title}</td>
                <td className="px-3 py-3 text-center">
                  <Toggle checked={enabled} onChange={(v) => patch(app.slug, { enabled: v })} />
                </td>
                <td className="px-3 py-3 text-center">
                  {enabled ? (
                    <Check checked={row?.canView ?? false} onChange={(v) => patch(app.slug, { canView: v })} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  {enabled && app.hasManage ? (
                    <Check
                      checked={row?.canManage ?? false}
                      onChange={(v) => patch(app.slug, { canManage: v })}
                    />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-4">
                  {enabled && extras.length > 0 ? (
                    <ul className="space-y-2 text-xs text-muted">
                      {extras.map((e) => (
                        <li key={e.key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#003322]"
                            checked={Boolean(row?.extras?.[e.key])}
                            onChange={(ev) => patchExtra(app.slug, e.key, ev.target.checked)}
                          />
                          <span>{e.label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-accent" : "bg-foreground/20"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-foreground transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Check({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 accent-[#003322]"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}
