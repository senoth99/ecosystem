import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();

  const employee = await prisma.employee.update({
    where: { id },
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

  return NextResponse.json(employee);
}
