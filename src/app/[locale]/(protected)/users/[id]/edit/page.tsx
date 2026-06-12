import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { UserForm } from "@/modules/users/components/user-form";
import { getUser } from "@/modules/users/actions/get-user";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [t, user] = await Promise.all([getTranslations("users"), getUser(id)]);
  return { title: user ? `${t("editTitle")} — ${user.name ?? user.email}` : t("editTitle") };
}

interface EditUserPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { locale, id } = await params;
  const [session, t, user] = await Promise.all([
    auth(),
    getTranslations("users"),
    getUser(id),
  ]);

  if (session?.user?.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("editTitle")}</h1>
        <p className="text-sm text-muted-foreground">{user.name ?? user.email}</p>
      </div>
      <UserForm user={user} />
    </div>
  );
}
