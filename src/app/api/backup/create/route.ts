import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    settings,
    users,
    customers,
    vehicles,
    products,
    offers,
    offerItems,
    importJobs,
    accounts,
    sessions,
    verificationTokens,
  ] = await Promise.all([
    prisma.settings.findMany(),
    prisma.user.findMany(),
    prisma.customer.findMany(),
    prisma.vehicle.findMany(),
    prisma.product.findMany(),
    prisma.offer.findMany(),
    prisma.offerItem.findMany(),
    prisma.importJob.findMany(),
    prisma.account.findMany(),
    prisma.session.findMany(),
    prisma.verificationToken.findMany(),
  ]);

  const backup = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    data: {
      settings,
      users,
      customers,
      vehicles,
      products,
      offers,
      offerItems,
      importJobs,
      accounts,
      sessions,
      verificationTokens,
    },
  };

  const filename = `cardesk-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(backup), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
