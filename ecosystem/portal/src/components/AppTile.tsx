import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

export function AppTile({ href, title, subtitle, icon: Icon }: Props) {
  return (
    <a
      href={href}
      className={cn(
        "app-tile relative block aspect-[1.35/1] min-h-[118px] overflow-hidden rounded-2xl",
        "border border-white/[0.1] bg-[#060607]",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-foreground/40"
      )}
    >
      {/* Фоновая иконка — крупная, серая, на всю плитку */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Icon
          className="app-tile-icon absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-[42%] -translate-y-[48%] text-foreground/[0.11]"
          strokeWidth={0.65}
        />
      </div>

      {/* Лёгкая виньетка по краям */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 30% 25%, transparent 0%, rgba(6,6,7,0.35) 55%, rgba(6,6,7,0.85) 100%)"
        }}
      />

      {/* Текст сверху слева */}
      <div className="relative z-[1] flex h-full flex-col p-4">
        <div className="text-[11px] font-bold uppercase leading-[1.25] tracking-[0.12em] text-foreground">
          {title}
        </div>
        <div className="mt-1.5 max-w-[11rem] text-[10px] leading-snug text-muted/90">{subtitle}</div>
      </div>
    </a>
  );
}
