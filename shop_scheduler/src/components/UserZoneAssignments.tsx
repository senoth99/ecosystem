"use client";

import type { Zone } from "@prisma/client";
import { useTransition } from "react";
import { setUserZoneAssignments } from "@/app/actions";

export function UserZoneAssignments({
  userId,
  userName,
  zones,
  assignedZoneIds
}: {
  userId: string;
  userName: string;
  zones: Pick<Zone, "id" | "name" | "isActive">[];
  assignedZoneIds: string[];
}) {
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-2 w-full space-y-2 border-t border-border pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const zoneIds = zones
          .filter((z) => z.isActive && fd.get(`zone-${z.id}`) === "on")
          .map((z) => z.id);
        start(async () => {
          await setUserZoneAssignments(userId, zoneIds);
        });
      }}
    >
      <p className="text-xs font-medium text-muted">Торговые точки для {userName}</p>
      <div className="flex flex-wrap gap-3">
        {zones
          .filter((z) => z.isActive)
          .map((zone) => (
            <label key={zone.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name={`zone-${zone.id}`}
                defaultChecked={assignedZoneIds.includes(zone.id)}
              />
              {zone.name}
            </label>
          ))}
      </div>
      <button type="submit" className="btn-secondary text-xs" disabled={pending}>
        {pending ? "..." : "Сохранить точки"}
      </button>
    </form>
  );
}
