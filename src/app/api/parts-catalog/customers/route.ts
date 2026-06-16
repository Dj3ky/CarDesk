import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const customers = await prisma.customer.findMany({
    where: {
      isActive: true,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { companyName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, firstName: true, lastName: true, companyName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 30,
  });

  return NextResponse.json({
    customers: customers.map((c) => ({
      id: c.id,
      name: c.companyName ?? `${c.firstName} ${c.lastName}`,
    })),
  });
}
