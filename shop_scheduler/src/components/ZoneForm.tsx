"use client";

import { useState, useTransition } from "react";
import { createZone } from "@/app/actions";

export function ZoneForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <form
      className="card grid gap-2 md:grid-cols-4 lg:grid-cols-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try {
            await createZone({
              name: String(fd.get("name")),
              description: String(fd.get("description") || ""),
              color: String(fd.get("color") || "#1f8f5f"),
              sortOrder: Number(fd.get("sortOrder") || 0),
              dayStartTime: String(fd.get("dayStartTime") || "10:00"),
              dayEndTime: String(fd.get("dayEndTime") || "22:00")
            });
            e.currentTarget.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось создать точку");
          }
        });
      }}
    >
      <input name="name" placeholder="Название" required className="rounded-lg bg-surface p-2" />
      <input name="description" placeholder="Описание" className="rounded-lg bg-surface p-2 md:col-span-2" />
      <input name="color" type="color" defaultValue="#1f8f5f" className="h-10 rounded-lg bg-surface p-1" title="Цвет" />
      <input name="sortOrder" type="number" defaultValue={0} className="rounded-lg bg-surface p-2" title="Порядок" />
      <input name="dayStartTime" type="time" defaultValue="10:00" className="rounded-lg bg-surface p-2" />
      <input name="dayEndTime" type="time" defaultValue="22:00" className="rounded-lg bg-surface p-2" />
      <button className="btn-primary" disabled={pending}>
        {pending ? "..." : "Создать точку"}
      </button>
      {error ? <p className="text-sm font-medium text-foreground/85 md:col-span-8">{error}</p> : null}
    </form>
  );
}
