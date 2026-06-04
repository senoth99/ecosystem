import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MeProfileCard } from "@/components/MeProfileCard";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { requireAuth } from "@/lib/auth";
import { catchDb } from "@/lib/dbBoundary";
import { prisma } from "@/lib/prisma";

export default async function MePage() {
  const user = await requireAuth();
  const loaded = await catchDb("me", async () => {
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { payoutDebtCents: true } });
    return { payoutDebtCents: row?.payoutDebtCents ?? 0 };
  });
  if (!loaded.ok) return <ServiceUnavailable scope="me" />;
  const { payoutDebtCents } = loaded.data;
  try {
    return (
      <div className="space-y-4">
        <MeProfileCard
          displayName={user.name}
          telegramUsername={user.telegramUsername ?? "user"}
          telegramPhotoUrl={user.telegramPhotoUrl}
          accentColor={user.color}
          initialFirstName={user.firstName ?? ""}
          initialLastName={user.lastName ?? ""}
        />
        <Link
          href="/stickers"
          className="-mt-2 card flex min-h-[52px] w-full max-w-full touch-manipulation items-center justify-between gap-3 transition-colors hover:bg-foreground/[0.04] active:opacity-90"
          aria-label="Открыть участие в кампании"
        >
          <div className="min-w-0">
            <p className="ui-section-kicker">Кампания</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">Наклейка на авто — 30 дней</p>
          </div>
          <ChevronRight className="h-6 w-6 shrink-0 text-muted" aria-hidden />
        </Link>
        <div className="card">
          <p className="text-sm text-muted">
            Баланс сейчас не используется для кампании (оставил поле в базе, чтобы не ломать auth/профили).
          </p>
          <p className="mt-2 text-xs text-muted">Текущее значение: {payoutDebtCents} коп.</p>
        </div>
      </div>
    );
  } catch (e) {
    console.error("[me/page render]", e);
    return <ServiceUnavailable scope="me" />;
  }
}
