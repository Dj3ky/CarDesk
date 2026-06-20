import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileForm } from "@/modules/users/components/profile-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("users.profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("users.profile"),
    getTranslations("common"),
  ]);

  const name = session?.user?.name ?? null;
  const email = session?.user?.email ?? "";
  const language = session?.user?.language ?? "en";

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email[0]?.toUpperCase() ?? "?";

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={session?.user?.image ?? ""} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold">{name ?? email}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">{email}</p>
            {session?.user?.role && (
              <Badge variant="secondary" className="capitalize text-xs">
                {tc(session.user.role.toLowerCase() as "admin" | "employee")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <ProfileForm name={name} email={email} language={language} />
    </div>
  );
}
