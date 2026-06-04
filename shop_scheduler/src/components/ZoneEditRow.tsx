"use client";

import type { Zone } from "@prisma/client";
import { useState, useTransition } from "react";
import { updateZone } from "@/app/actions";

function toTimeInput(value: string) {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

export function ZoneEditRow({ zone }: { zone: Zone }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  if (!editing) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: zone.color ?? "#1f8f5f" }}
              aria-hidden
            />
            <span className="font-semibold">{zone.name}</span>
            <span className={`text-xs ${zone.isActive ? "text-accent" : "text-muted"}`}>
              {zone.isActive ? "Активна" : "Отключена"}
            </span>
          </div>
          {zone.description ? <p className="mt-1 text-sm text-muted">{zone.description}</p> : null}
          <p className="mt-1 text-sm text-muted">
            {zone.dayStartTime}–{zone.dayEndTime}
            {zone.sortOrder !== 0 ? ` · порядок ${zone.sortOrder}` : ""}
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
          Редактировать
        </button>
      </div>
    );
  }

  return (
    <form
      className="card grid gap-2 md:grid-cols-4 lg:grid-cols-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try {
            await updateZone(zone.id, {
              name: String(fd.get("name")),
              description: String(fd.get("description") || ""),
              color: String(fd.get("color") || "#1f8f5f"),
              sortOrder: Number(fd.get("sortOrder") || 0),
              dayStartTime: String(fd.get("dayStartTime") || "10:00"),
              dayEndTime: String(fd.get("dayEndTime") || "22:00"),
              isActive: fd.get("isActive") === "on"
            });
            setEditing(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось сохранить");
          }
        });
      }}
    >
      <input name="name" defaultValue={zone.name} required className="rounded-lg bg-surface p-2" />
      <input
        name="description"
        defaultValue={zone.description ?? ""}
        placeholder="Описание"
        className="rounded-lg bg-surface p-2 md:col-span-2"
      />
      <input name="color" type="color" defaultValue={zone.color ?? "#1f8f5f"} className="h-10 rounded-lg bg-surface p-1" />
      <input name="sortOrder" type="number" defaultValue={zone.sortOrder} className="rounded-lg bg-surface p-2" />
      <input
        name="dayStartTime"
        type="time"
        defaultValue={toTimeInput(zone.dayStartTime)}
        className="rounded-lg bg-surface p-2"
      />
      <input
        name="dayEndTime"
        type="time"
        defaultValue={toTimeInput(zone.dayEndTime)}
        className="rounded-lg bg-surface p-2"
      />
      <label className="flex items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={zone.isActive} />
        Активна
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-8">
        <button className="btn-primary" disabled={pending} type="submit">
          {pending ? "..." : "Сохранить"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
          Отмена
        </button>
      </div>
      {error ? <p className="text-sm font-medium text-foreground/85 md:col-span-8">{error}</p> : null}
    </form>
  );
}
