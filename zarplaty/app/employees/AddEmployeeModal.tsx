"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddEmployeeModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);

    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: formData.get("fullName"),
        department: formData.get("department"),
        salary: Number(formData.get("salary")),
        payoutDate: formData.get("payoutDate"),
        worksFromMonth: Number(formData.get("worksFromMonth")),
        worksFromYear: Number(formData.get("worksFromYear")),
        hasNda: formData.get("hasNda") === "on",
      }),
    });

    setLoading(false);
    if (!res.ok) return;

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn" style={{ width: 240 }} onClick={() => setOpen(true)}>
        Добавить сотрудника
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "grid",
            placeItems: "center",
            zIndex: 60,
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <section
            className="block"
            style={{ width: "100%", maxWidth: 860, padding: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="title" style={{ fontSize: 20, marginBottom: 14 }}>
              Новый сотрудник
            </div>
            <form
              onSubmit={onSubmit}
              className="grid"
              style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
            >
              <input name="fullName" className="field" placeholder="ФИО" required />
              <input name="department" className="field" placeholder="Отдел" required />
              <input name="salary" className="field" type="number" placeholder="Зарплата" required />
              <input name="payoutDate" className="field" type="date" required />
              <select name="worksFromMonth" className="select" defaultValue="1">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Месяц {m}
                  </option>
                ))}
              </select>
              <input
                name="worksFromYear"
                className="field"
                type="number"
                defaultValue={new Date().getFullYear()}
                required
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid #252a33",
                  padding: "0 12px",
                  height: 44,
                }}
              >
                <input name="hasNda" type="checkbox" />
                NDA
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn" type="submit" disabled={loading}>
                  {loading ? "Добавление..." : "Добавить"}
                </button>
                <button className="btn" type="button" onClick={() => setOpen(false)}>
                  Отмена
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
