"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SquarePen } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { NotificationBell } from "@/components/NotificationBell";
import { SwipePageSwitch } from "@/components/SwipePageSwitch";
import { cn } from "@/lib/utils";
import { BRAND_LOGO_SRC } from "@/lib/brandLogo";

const headerChipClass =
  "inline-flex min-h-8 touch-manipulation items-center rounded-lg border border-border bg-foreground/[0.06] px-2.5 text-[10px] font-medium text-foreground no-underline transition hover:bg-foreground/[0.1]";

/** Шапка/низ через pathname на клиенте — без headers() в root layout (меньше сбоев RSC в dev). */
export function AppShell({
  children,
  showManagerNav,
  showAdminShortcut,
  authenticated,
  showZoneSwitcher
}: {
  children: React.ReactNode;
  showManagerNav: boolean;
  showAdminShortcut: boolean;
  authenticated: boolean;
  showZoneSwitcher?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const hideAppChrome = pathname === "/telegram/login" || pathname === "/access-denied";

  return (
    <>
      {!hideAppChrome ? (
        <header className="sticky top-0 z-[110] border-b border-border bg-black backdrop-blur-[2px]">
          <div className="mx-auto grid max-w-5xl grid-cols-3 items-center px-3 py-2.5">
            <div className="flex min-w-0 items-center justify-start">
              {authenticated ? <NotificationBell /> : null}
            </div>
            <div className="flex flex-col items-center justify-center">
              <Link href="/me" aria-label="Открыть личный кабинет">
                <img
                  src={BRAND_LOGO_SRC}
                  alt="Shop Scheduler"
                  className="h-10 w-auto max-w-[210px] object-contain opacity-95"
                />
              </Link>
            </div>
            <div className="flex flex-col items-end justify-center gap-1">
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {authenticated && showZoneSwitcher ? (
                  <Link href="/select-point" prefetch={false} className={headerChipClass}>
                    Сменить точку
                  </Link>
                ) : null}
                {showAdminShortcut ? (
                  <Link
                    href="/admin"
                    className="inline-flex min-h-8 min-w-8 touch-manipulation items-center justify-center rounded-lg border border-border bg-foreground/[0.06] text-foreground transition hover:bg-foreground/[0.1]"
                    aria-label="Админка"
                    title="Админка"
                  >
                    <SquarePen size={16} aria-hidden />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </header>
      ) : null}
      <main
        className={cn(
          "mx-auto max-w-5xl",
          hideAppChrome
            ? "min-h-screen min-h-[100dvh] p-0"
            : "min-h-[calc(100vh-108px)] p-3 pb-24 md:min-h-[calc(100vh-120px)] md:p-5 md:pb-24"
        )}
      >
        <SwipePageSwitch>{children}</SwipePageSwitch>
      </main>
      {!hideAppChrome ? <BottomNav showManager={showManagerNav} /> : null}
    </>
  );
}
