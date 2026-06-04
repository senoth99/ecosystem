"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/AuthShell";
import { TelegramLogin } from "@/components/TelegramLogin";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  return (
    <AuthShell title="Casher Ecosystem" description="Вход по Telegram для доступа ко всем приложениям">
      <TelegramLogin
        onSuccess={() => {
          router.replace(next.startsWith("/") ? next : "/");
          router.refresh();
        }}
      />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
