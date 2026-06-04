import { addDays } from "date-fns";
import { PrismaClient } from "@prisma/client";
import { getWeekStart } from "../src/lib/utils";
import { createHash, randomBytes } from "crypto";
import { UserRole } from "../src/lib/enums";

const prisma = new PrismaClient();
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const generateRawToken = () => randomBytes(32).toString("hex");

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.shiftReport.deleteMany();
  await prisma.shiftTimeLog.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.userZone.deleteMany();
  await prisma.zoneLimit.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.accessToken.deleteMany();
  await prisma.user.deleteMany();

  const usersData = [
    ["Суперадмин", UserRole.SUPER_ADMIN],
    ["Админ", UserRole.ADMIN],
    ["Коля", UserRole.EMPLOYEE],
    ["Дима", UserRole.EMPLOYEE],
    ["Андрей", UserRole.EMPLOYEE],
    ["Ваня П", UserRole.EMPLOYEE],
    ["Макар", UserRole.EMPLOYEE],
    ["Даниил", UserRole.EMPLOYEE]
  ] as const;
  const users = [];
  for (const [name, role] of usersData) {
    users.push(
      await prisma.user.create({
        data: {
          name,
          role,
          color: "#1f8f5f",
          payoutDebtCents: role === UserRole.EMPLOYEE ? 150000 + Math.floor(Math.random() * 450000) : 0
        }
      })
    );
  }

  const zone = await prisma.zone.create({
    data: {
      name: "Шоурум на флаконе",
      sortOrder: 1,
      dayStartTime: "12:00",
      dayEndTime: "21:00",
      lunchStartTime: "15:00",
      lunchEndTime: "16:00",
      checkInQrToken: randomBytes(16).toString("hex")
    }
  });
  const zones = [zone];

  const employees = users.filter((u) => u.role === UserRole.EMPLOYEE);

  const weekStartDate = getWeekStart();
  await prisma.scheduleWeek.create({ data: { weekStartDate } });

  for (let i = 0; i < employees.length; i++) {
    await prisma.shift.create({
      data: {
        userId: employees[i].id,
        zoneId: zone.id,
        weekStartDate,
        dayOfWeek: (i % 5) + 1,
        startTime: zone.dayStartTime,
        endTime: zone.dayEndTime
      }
    });
  }

  await prisma.systemSettings.createMany({
    data: [
      { key: "schedule.slotStart", value: "10:00" },
      { key: "schedule.slotEnd", value: "22:00" },
      { key: "schedule.slotStepMinutes", value: "60" }
    ]
  });

  const superAdmin = users.find((u) => u.role === UserRole.SUPER_ADMIN)!;
  const rawToken = generateRawToken();
  await prisma.accessToken.create({
    data: {
      userId: superAdmin.id,
      tokenHash: hashToken(rawToken)
    }
  });
  console.log(`Ссылка входа суперадмина: ${(process.env.APP_URL ?? "http://localhost:3000")}/login/token/${rawToken}`);
  console.log(`Точки: ${zones.map((z) => z.name).join(", ")}`);
  console.log(`Текущая неделя начинается: ${weekStartDate.toISOString().slice(0, 10)}; проверка даты+7: ${addDays(weekStartDate, 7).toISOString().slice(0, 10)}`);
}

main().finally(async () => {
  await prisma.$disconnect();
});
