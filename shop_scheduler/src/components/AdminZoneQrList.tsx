"use client";

import { AdminQrDownloadButton } from "@/components/AdminQrDownloadButton";

type ZoneRow = {
  id: string;
  name: string;
};

export function AdminZoneQrList({ zones }: { zones: ZoneRow[] }) {
  if (zones.length === 0) {
    return <p className="text-sm text-muted">Нет активных точек. Создайте их в разделе «Офлайн-точки».</p>;
  }

  return (
    <ul className="space-y-3">
      {zones.map((zone) => (
        <li
          key={zone.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/40 px-3 py-3"
        >
          <span className="text-sm font-semibold">{zone.name}</span>
          <AdminQrDownloadButton zoneId={zone.id} zoneName={zone.name} label="Скачать QR" />
        </li>
      ))}
    </ul>
  );
}
