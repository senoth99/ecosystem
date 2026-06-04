"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ecoFetch } from "@/lib/utils";
import type { MeResponse } from "@/lib/types";
import { AppTile } from "@/components/AppTile";
import {
  LayoutGrid,
  Package,
  Factory,
  Store,
  Sticker,
  Users,
  Wallet,
  ClipboardList,
  LogOut,
  Shield
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  bloggers: Users,
  drops: Package,
  "production-scheduler": Factory,
  "shop-scheduler": Store,
  nakleiki: Sticker,
  proizvodstvo: Factory,
  "proizvodstvo-zakazi": ClipboardList,
  zarplaty: Wallet
};

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ecoFetch("/me")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        setData(await res.json());
      })
      .finally(() => setLoading(false));
  }, [router]);

  const logout = () => {
    ecoFetch("/auth/logout", { method: "POST" }).then(() => router.replace("/login"));
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-muted">
        Загрузка…
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="relative mx-auto min-h-[100dvh] max-w-xl px-4 pb-10 pt-[max(1.25rem,var(--safe-top))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_50%_0%,rgba(0,51,34,0.22),transparent_70%)]" />

      <header className="relative mb-8 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-display text-muted">Casher</p>
          <h1 className="ui-page-title">Экосистема</h1>
          <p className="mt-1.5 text-sm text-muted">{data.user.displayName}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {data.user.isSuperAdmin ? (
            <Link
              href="/admin"
              className="header-icon-btn flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border bg-card"
              title="Права доступа"
            >
              <Shield className="h-4 w-4" strokeWidth={1.2} />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="header-icon-btn min-h-10 min-w-10 rounded-lg border border-border bg-card"
            title="Выйти"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.2} />
          </button>
        </div>
      </header>

      <div className="relative grid grid-cols-2 gap-3.5">
        {data.apps.map((app) => {
          const Icon = ICONS[app.slug] ?? LayoutGrid;
          const subtitle = app.canManage ? "Просмотр и управление" : "Просмотр";
          return (
            <AppTile
              key={app.slug}
              href={app.path}
              title={app.title}
              subtitle={subtitle}
              icon={Icon}
            />
          );
        })}
      </div>

      {data.apps.length === 0 ? (
        <p className="relative mt-8 text-center text-sm text-muted">
          Нет доступных приложений. Обратитесь к администратору.
        </p>
      ) : null}
    </div>
  );
}
