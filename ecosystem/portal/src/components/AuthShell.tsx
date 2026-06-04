import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  description,
  children
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(0,51,34,0.35),transparent_42%)]" />
      <div className="relative w-full max-w-md space-y-6 rounded-lg border border-border bg-background p-6 md:p-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-border bg-card text-2xl font-bold tracking-display">
            C
          </div>
          <h1 className="ui-page-title text-2xl sm:text-3xl">{title}</h1>
          {description ? <p className="text-sm text-muted">{description}</p> : null}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
