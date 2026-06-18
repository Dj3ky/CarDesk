import React from "react";
import path from "path";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { uploadsDir } from "@/app/api/upload/route";

function resolveLogoPath(logo: string | null | undefined): string | null {
  if (!logo) return null;
  if (logo.startsWith("/api/upload/")) {
    return path.join(uploadsDir(), path.basename(logo));
  }
  return logo; // external https:// URL — pass through
}
import { canAccess } from "@/lib/permissions";
import { getWorkOrder } from "@/modules/work-orders/actions/get-work-order";
import { getSettings } from "@/modules/settings/actions/get-settings";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workOrderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!canAccess(session.user, "work_orders")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { workOrderId } = await params;
  const [workOrder, settings] = await Promise.all([getWorkOrder(workOrderId), getSettings()]);

  if (!workOrder) {
    return new Response("Work order not found", { status: 404 });
  }

  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { WorkOrderPDF } = await import("@/modules/work-orders/pdf/work-order-pdf");

  const resolvedLogo = resolveLogoPath(settings.companyLogo);

  const element = React.createElement(WorkOrderPDF, { workOrder, settings: { ...settings, companyLogo: resolvedLogo } });
  const render = renderToBuffer as (el: React.ReactElement) => Promise<Buffer>;
  const buffer = await render(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${workOrder.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
