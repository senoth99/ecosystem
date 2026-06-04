import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPS = [
  { slug: "bloggers", title: "Блогеры", path: "/bloggers", sortOrder: 10, hasManage: true },
  { slug: "drops", title: "Дропы", path: "/drops", sortOrder: 20, hasManage: true },
  {
    slug: "production-scheduler",
    title: "Производство (смены)",
    path: "/scheduler",
    sortOrder: 30,
    hasManage: true,
    extraPerms: [
      { key: "manage_statuses", label: "Управление статусами задач" },
      { key: "create_own_tasks", label: "Создание собственных задач" },
      { key: "create_dept_tasks", label: "Создание задач по отделу" }
    ]
  },
  { slug: "shop-scheduler", title: "Магазин (смены)", path: "/shop", sortOrder: 40, hasManage: true },
  { slug: "nakleiki", title: "Наклейки", path: "/nakleiki", sortOrder: 50, hasManage: true },
  { slug: "proizvodstvo", title: "Производство", path: "/proizvodstvo", sortOrder: 60, hasManage: true },
  { slug: "proizvodstvo-zakazi", title: "Заказы производства", path: "/zakazi", sortOrder: 70, hasManage: true },
  { slug: "zarplaty", title: "Зарплаты", path: "/zarplaty", sortOrder: 80, hasManage: true }
];

async function main() {
  for (const app of APPS) {
    await prisma.ecosystemApp.upsert({
      where: { slug: app.slug },
      create: app,
      update: {
        title: app.title,
        path: app.path,
        sortOrder: app.sortOrder,
        hasManage: app.hasManage,
        extraPerms: app.extraPerms ?? undefined
      }
    });
  }
  console.log("Seeded", APPS.length, "apps");
}

main()
  .finally(() => prisma.$disconnect());
