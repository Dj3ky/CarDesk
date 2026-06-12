import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/modules/auth/components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <span className="text-3xl font-bold text-primary">CarDesk</span>
        </div>
        <CardTitle className="text-2xl text-center">{t("loginTitle")}</CardTitle>
        <CardDescription className="text-center">{t("loginSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
