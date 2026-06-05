"use client";

import { useState } from "react";
import { ecoFetch } from "@/lib/utils";

export function PasswordLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await ecoFetch("/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
        return;
      }
      setError(data.error ?? "Неверный пароль");
      setPassword("");
    } catch {
      setError("Сбой сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={e => { setPassword(e.target.value); setError(""); }}
        autoFocus
        className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground"
      />
      <button type="submit" className="btn-primary w-full" disabled={loading || !password}>
        {loading ? "Подождите…" : "Войти"}
      </button>
    </form>
  );
}
