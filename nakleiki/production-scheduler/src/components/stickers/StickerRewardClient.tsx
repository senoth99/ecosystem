"use client";

import { useEffect, useState, useTransition } from "react";

type Claim = {
  id: string;
  status: string;
  size: string | null;
  address: string | null;
  phone: string | null;
  comment: string | null;
};

type ApiGet = {
  eligible: boolean;
  claim: Claim | null;
  error?: string;
};

export function StickerRewardClient() {
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [size, setSize] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stickers/reward", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as ApiGet;
      if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить");
      setEligible(Boolean(data.eligible));
      setClaim(data.claim ?? null);
      if (data.claim) {
        setSize(data.claim.size ?? "");
        setAddress(data.claim.address ?? "");
        setPhone(data.claim.phone ?? "");
        setComment(data.claim.comment ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = () => {
    start(async () => {
      setError(null);
      try {
        const res = await fetch("/api/stickers/reward", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            size: size.trim(),
            address: address.trim(),
            phone: phone.trim(),
            comment: comment.trim() || undefined
          })
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; claim?: Claim };
        if (!res.ok) throw new Error(data.error ?? "Не удалось отправить");
        setClaim(data.claim ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="card skeleton h-20" />
        <div className="card skeleton h-52" />
      </div>
    );
  }

  if (!eligible && !claim) {
    return (
      <div className="space-y-4">
        <h1 className="ui-page-title">Шмотка</h1>
        <div className="card text-sm text-muted">Пока нельзя: нужно закрыть прогресс 30 дней (после аппрува заявки).</div>
        <a href="/stickers/daily" className="btn-primary inline-flex items-center justify-center">
          Перейти к ежедневным фото
        </a>
        {error ? <p className="text-center text-sm font-medium text-foreground/85">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="ui-page-title">Шмотка</h1>
        {claim ? (
          <span className="text-[10px] font-bold uppercase tracking-display text-muted">статус: {claim.status}</span>
        ) : null}
      </div>

      <div className="card space-y-3">
        <p className="text-sm text-muted">Заполните данные — мы передадим менеджеру на выдачу/доставку.</p>

        <div className="grid gap-2">
          <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Размер (например: M)" disabled={pending} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон для связи" disabled={pending} />
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Адрес доставки"
            className="min-h-[88px] w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[14px]"
            disabled={pending}
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Комментарий (необязательно)"
            className="min-h-[72px] w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[14px]"
            disabled={pending}
          />
        </div>

        <button
          className="btn-primary w-full"
          disabled={pending || !size.trim() || !phone.trim() || address.trim().length < 8}
          onClick={submit}
        >
          {pending ? "Отправляем..." : claim ? "Обновить данные" : "Отправить"}
        </button>

        {error ? <p className="text-center text-sm font-medium text-foreground/85">{error}</p> : null}
      </div>
    </div>
  );
}

