"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export function AuthGate({ children }: { children: ReactNode }) {
  const { hydrated, isAuthenticated } = useAuth();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!hydrated) return;
    if (pathname.startsWith("/login")) return;
    if (!isAuthenticated) {
      const q = searchParams?.toString();
      const next = q ? `${pathname}?${q}` : pathname;
      const base = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
      window.location.assign(
        `/login?${new URLSearchParams({ next: `${base}${next || "/integrations"}` }).toString()}`,
      );
    }
  }, [hydrated, isAuthenticated, pathname, searchParams]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg text-app-fg/55">
        Загрузка…
      </div>
    );
  }

  if (!pathname.startsWith("/login") && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg text-app-fg/55">
        Загрузка…
      </div>
    );
  }

  return <>{children}</>;
}
