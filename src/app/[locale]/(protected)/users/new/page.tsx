import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { UserForm } from "@/modules/users/components/user-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("users");
  return { title: t("newTitle") };
}

interface NewUserPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewUserPage({ params }: NewUserPageProps) {
  const { locale } = await params;
  const [session, t] = await Promise.all([auth(), getTranslations("users")]);

  if (!canAccess(session?.user ?? { role: "", permissions: [] }, "users")) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("newTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("newSubtitle")}</p>
      </div>
      <UserForm />
    </div>
  );
}
