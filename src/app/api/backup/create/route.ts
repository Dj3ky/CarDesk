import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Products are excluded — they are large catalog data managed via CSV import/export.
// Restore them using the CSV import feature.

const BATCH = 500;

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filename = `cardesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const push = (s: string) => controller.enqueue(enc.encode(s));

      async function streamTable(name: string) {
        push(`,"${name}":[`);
        let cursor: string | undefined;
        let firstRow = true;
        while (true) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const batch: any[] = await (prisma as any)[name].findMany({
            take: BATCH,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: { id: "asc" },
          });
          for (const row of batch) {
            if (!firstRow) push(",");
            push(JSON.stringify(row));
            firstRow = false;
          }
          if (batch.length < BATCH) break;
          cursor = batch[batch.length - 1].id;
        }
        push("]");
      }

      try {
        push(`{"version":"1.0","createdAt":"${new Date().toISOString()}","data":{`);

        // Settings singleton — load all at once
        push('"settings":');
        push(JSON.stringify(await prisma.settings.findMany()));

        // Business-critical operational data
        await streamTable("user");
        await streamTable("customer");
        await streamTable("vehicle");
        await streamTable("offer");
        await streamTable("offerItem");
        await streamTable("priceRule");

        // Auth tables
        await streamTable("account");
        await streamTable("session");

        // VerificationToken has no `id` field — load all at once
        push(',"verificationToken":');
        push(JSON.stringify(await prisma.verificationToken.findMany()));

        push("}}");
        controller.close();
      } catch (err) {
        console.error("[backup/create]", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
