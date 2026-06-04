"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Employee = {
  id: string;
  fullName: string;
  department: string;
  salary: number;
  payoutDate: string;
  worksFromMonth: number;
  worksFromYear: number;
  hasNda: boolean;
};

export default function EmployeeCardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then(setEmployee);
  }, [id]);

  if (!employee) {
    return (
      <main className="page" style={{ display: "grid", placeItems: "center" }}>
        Загрузка...
      </main>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSaving(true);

    await fetch(`/api/employees/${id}`, {
      method: "PUT",
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

    setSaving(false);
    router.push("/employees");
    router.refresh();
  }

  const payoutDate = new Date(employee.payoutDate).toISOString().slice(0, 10);

  return (
    <main className="page">
      <header className="header">
        <div className="header-inner">
          <img className="logo-spin" src="/api/logo" alt="Logo" />
        </div>
      </header>

      <div className="container" style={{ paddingTop: 20 }}>
        <Link href="/employees" className="btn" style={{ display: "inline-grid", placeItems: "center", width: 180, marginBottom: 16 }}>
          Назад
        </Link>
        <section className="block" style={{ padding: 20, maxWidth: 780 }}>
          <div className="title" style={{ fontSize: 26, marginBottom: 16 }}>
            Карточка сотрудника
          </div>
          <form onSubmit={onSubmit} className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <input name="fullName" className="field" defaultValue={employee.fullName} required />
            <input name="department" className="field" defaultValue={employee.department} required />
            <input name="salary" className="field" type="number" defaultValue={employee.salary} required />
            <input name="payoutDate" className="field" type="date" defaultValue={payoutDate} required />
            <select name="worksFromMonth" className="select" defaultValue={String(employee.worksFromMonth)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Месяц {m}
                </option>
              ))}
            </select>
            <input name="worksFromYear" className="field" type="number" defaultValue={employee.worksFromYear} required />
            <label style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #252a33", padding: "0 12px", height: 44 }}>
              <input name="hasNda" type="checkbox" defaultChecked={employee.hasNda} />
              NDA подписан
            </label>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
