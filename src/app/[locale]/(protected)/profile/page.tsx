import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("profile") };
}

export default async function ProfilePage() {
  const t = await getTranslations();
  const session = await auth();

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.profile")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session?.user?.image ?? ""} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{session?.user?.name}</p>
              <p className="text-muted-foreground text-sm">{session?.user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("dashboard.role")}</p>
              <Badge variant="secondary" className="mt-1 capitalize">
                {session?.user?.role
                  ? t(`common.${session.user.role.toLowerCase() as "admin" | "employee"}`)
                  : "—"}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">User ID</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{session?.user?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
