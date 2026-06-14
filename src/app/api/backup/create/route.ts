import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

      // Stream a full table in cursor-paginated batches to avoid OOM.
      async function streamTable(name: string, first: boolean) {
        if (!first) push(",");
        push(`"${name}":[`);
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

        // Small / fixed tables — load all at once (no id cursor needed).
        push('"settings":');
        push(JSON.stringify(await prisma.settings.findMany()));

        push(',"verificationTokens":');
        push(JSON.stringify(await prisma.verificationToken.findMany()));

        // Paginated tables
        await streamTable("account", false);
        await streamTable("session", false);
        await streamTable("user", false);
        await streamTable("customer", false);
        await streamTable("vehicle", false);
        await streamTable("product", false);
        await streamTable("offer", false);
        await streamTable("offerItem", false);
        await streamTable("importJob", false);
        await streamTable("auditLog", false);
        await streamTable("priceRule", false);

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
