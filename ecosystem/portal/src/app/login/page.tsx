"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/AuthShell";
import { PasswordLogin } from "@/components/PasswordLogin";

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  return (
    <AuthShell title="Casher Ecosystem" description="Вход по паролю для доступа ко всем приложениям">
      <PasswordLogin
        onSuccess={() => {
          const dest = next.startsWith("/") ? next : "/";
          // Полная перезагрузка — cookie eco_session гарантированно уходит в следующий запрос (Safari, переход в /bloggers/…).
          window.location.assign(dest);
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
