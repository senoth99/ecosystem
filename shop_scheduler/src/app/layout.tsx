import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { getShellSessionUser } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { canOpenManagerPanel } from "@/lib/managerPanel";
import { MULTI_ZONE_ENABLED } from "@/lib/multiZone";
import { getAccessibleZonesForUser } from "@/lib/zoneAccess";

import "./globals.css";

/** Сессия и cookies только на запрос — избегаем нестыковок при пререндере/кеше. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop Scheduler — График точек",
  description: "График смен и отчётность по торговым точкам",
  /** Меньше «умных» подчёркиваний дат/телефонов в Safari и Telegram WebView */
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
    date: false
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let shell: Awaited<ReturnType<typeof getShellSessionUser>> = null;
  try {
    shell = await getShellSessionUser();
  } catch (e) {
    console.error("[RootLayout:getShellSessionUser]", e);
  }

  let showAdminShortcut = false;
  let showManagerNav = false;
  let showZoneSwitcher = false;

  try {
    showAdminShortcut =
      shell?.role === UserRole.SUPER_ADMIN || shell?.role === UserRole.ADMIN;
    showManagerNav = Boolean(shell && canOpenManagerPanel(shell));
    if (shell && MULTI_ZONE_ENABLED) {
      const accessible = await getAccessibleZonesForUser({ id: shell.id, role: shell.role });
      showZoneSwitcher = shell.role === UserRole.SUPER_ADMIN || accessible.length >= 2;
    }
  } catch (e) {
    console.error("[RootLayout:nav]", e);
  }

  return (
    <html lang="ru" className="dark">
      <body>
        <AppShell
          showManagerNav={showManagerNav}
          showAdminShortcut={showAdminShortcut}
          authenticated={Boolean(shell)}
          showZoneSwitcher={showZoneSwitcher}
        >
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted">
                Загрузка…
              </div>
            }
          >
            {children}
          </Suspense>
        </AppShell>
      </body>
    </html>
  );
}
