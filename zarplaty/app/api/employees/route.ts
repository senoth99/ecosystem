import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const employees = await prisma.employee.findMany({
    orderBy: [{ department: "asc" }, { fullName: "asc" }],
  });
  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  const body = await req.json();
  const employee = await prisma.employee.create({
    data: {
      fullName: String(body.fullName),
      department: String(body.department),
      salary: Number(body.salary),
      payoutDate: new Date(body.payoutDate),
      worksFromMonth: Number(body.worksFromMonth),
      worksFromYear: Number(body.worksFromYear),
      hasNda: Boolean(body.hasNda),
    },
  });
  return NextResponse.json(employee, { status: 201 });
}
