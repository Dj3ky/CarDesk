import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings } from "@/modules/settings/actions/get-settings";
import { updateSettings } from "@/modules/settings/actions/update-settings";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const result = await updateSettings(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error, fieldErrors: result.fieldErrors },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
