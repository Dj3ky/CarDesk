import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();
  const lang = session?.user?.language ?? "sl";
  redirect(`/${lang}/dashboard`);
}
