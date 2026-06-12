import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { UserTable } from "@/modules/users/components/user-table";
import { getUsers } from "@/modules/users/actions/get-users";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("users");
  return { title: t("title") };
}

interface UsersPageProps {
  params: Promise<{ locale: string }>;
}

export default async function UsersPage({ params }: UsersPageProps) {
  const { locale } = await params;
  const [session, t, users] = await Promise.all([
    auth(),
    getTranslations("users"),
    getUsers(),
  ]);

  if (session?.user?.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle", { count: users.length })}
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/users/new`}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t("addNew")}
          </Link>
        </Button>
      </div>

      <UserTable users={users} currentUserId={session!.user!.id!} />
    </div>
  );
}
