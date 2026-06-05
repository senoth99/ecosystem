"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function enabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_BASE_PATH?.trim());
}

export function EcosystemBackButton({ aboveBottomNav = false }: { aboveBottomNav?: boolean }) {
  const pathname = usePathname() ?? "";
  if (!enabled() || pathname.startsWith("/login") || pathname === "/telegram/login") return null;

  return (
    <Link
      href="/"
      title="Меню экосистемы"
      aria-label="В меню экосистемы"
      className={`fixed left-4 z-[200] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#0a0a0a]/90 text-white/90 shadow-[0_4px_24px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-emerald-600/50 hover:text-white ${
        aboveBottomNav ? "bottom-[5.5rem]" : "bottom-6"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m15 18-6-6 6-6" />
        <path d="M21 12H9" />
        <path d="M3 6v12" />
      </svg>
    </Link>
  );
}
