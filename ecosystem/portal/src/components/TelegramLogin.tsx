"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ecoFetch } from "@/lib/utils";

const POLL_MS = 800;

export function TelegramLogin({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "");

  const startBrowser = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await ecoFetch("/auth/browser/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      tokenRef.current = data.token ?? null;
      setOpenUrl(data.openUrl ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tokenRef.current) return;
    const id = window.setInterval(async () => {
      const res = await ecoFetch("/auth/browser/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current })
      });
      const data = await res.json();
      if (data.ok) {
        window.clearInterval(id);
        onSuccess();
      }
      if (res.status === 403) {
        setError("Доступ не выдан");
        window.clearInterval(id);
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [openUrl, onSuccess]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = () => {
      const initData = window.Telegram?.WebApp?.initData?.trim();
      if (!initData) return;
      ecoFetch("/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData })
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok) onSuccess();
          else if (res.status === 403) setError("Доступ не выдан");
          else setError(data.error ?? "Ошибка");
        })
        .catch(() => setError("Сбой сети"));
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, [onSuccess]);

  const devLogin =
    process.env.NEXT_PUBLIC_TELEGRAM_AUTH_DEV === "true" &&
    process.env.NODE_ENV !== "production";

  return (
    <div className="space-y-4">
      {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}
      <button type="button" className="btn-primary w-full" disabled={loading} onClick={startBrowser}>
        {loading ? "Подождите…" : "Войти через Telegram"}
      </button>
      {openUrl ? (
        <a href={openUrl} target="_blank" rel="noreferrer" className="btn-secondary block w-full text-center">
          Открыть бота {botUsername ? `@${botUsername}` : ""}
        </a>
      ) : null}
      {devLogin ? (
        <button
          type="button"
          className="btn-secondary w-full text-[10px]"
          onClick={async () => {
            setError("");
            setLoading(true);
            try {
              const res = await ecoFetch("/auth/telegram/dev", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  username: "contact_voropaev",
                  telegramId: 100001
                })
              });
              const data = (await res.json()) as { error?: string };
              if (res.ok) onSuccess();
              else setError(data.error ?? "Dev login failed");
            } catch {
              setError("Сбой сети");
            } finally {
              setLoading(false);
            }
          }}
        >
          Dev login
        </button>
      ) : null}
    </div>
  );
}

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData?: string; ready?: () => void; expand?: () => void } };
  }
}
