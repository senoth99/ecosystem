import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AddEmployeeModal from "./AddEmployeeModal";

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function formatDate(input: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(input);
}

export default async function EmployeesPage() {
  await requireAuth();

  const employees = await prisma.employee.findMany({
    orderBy: [{ department: "asc" }, { fullName: "asc" }],
  });

  const grouped = employees.reduce<Record<string, typeof employees>>((acc, employee) => {
    if (!acc[employee.department]) acc[employee.department] = [];
    acc[employee.department].push(employee);
    return acc;
  }, {});

  return (
    <main className="page">
      <header className="header">
        <div className="header-inner">
          <img className="logo-spin" src="/api/logo" alt="Logo" />
        </div>
      </header>

      <div className="container" style={{ paddingTop: 20 }}>
        <div style={{ marginBottom: 18 }}>
          <AddEmployeeModal />
        </div>

        <section className="grid" style={{ gap: 18 }}>
          {Object.entries(grouped).map(([department, items]) => (
            <div key={department} className="block" style={{ padding: 14 }}>
              <div className="title" style={{ fontSize: 20, marginBottom: 10 }}>
                {department}
              </div>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                {items.map((employee) => (
                  <Link key={employee.id} href={`/employees/${employee.id}`} className="employee-card">
                    <div className="title" style={{ fontSize: 18, marginBottom: 12 }}>
                      {employee.fullName}
                    </div>
                    <div className="chips" style={{ marginBottom: 14 }}>
                      <div className="chip">{employee.department}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 36, marginBottom: 6 }}>{formatMoney(employee.salary)}</div>
                    <div style={{ color: "#97a0ad" }}>{formatDate(employee.payoutDate)}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
