"use client";

import { useState, useTransition } from "react";
import { adminSetRoleByTelegramUsername } from "@/app/actions";
import { UserRole } from "@/lib/enums";

export function AdminRoleByTelegramUsernameForm() {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EMPLOYEE">("ADMIN");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const trimmed = username.trim().toLowerCase().replace(/^@/, "");

  return (
    <form
      className="card grid gap-2 md:grid-cols-[1fr,200px,auto]"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          try {
            await adminSetRoleByTelegramUsername({ username: trimmed, role });
            setUsername("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка");
          }
        });
      }}
    >
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="@telegram_username"
        className="min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "ADMIN" | "EMPLOYEE")}
        className="min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      >
        <option value={UserRole.ADMIN}>ADMIN</option>
        <option value={UserRole.EMPLOYEE}>EMPLOYEE</option>
      </select>
      <button className="btn-primary w-full md:w-auto" disabled={pending || !trimmed}>
        {pending ? "Сохраняем..." : "Выдать роль"}
      </button>
      {error ? <p className="text-sm font-medium text-foreground/85 md:col-span-3">{error}</p> : null}
    </form>
  );
}

