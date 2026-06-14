import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/modules/auth/components/login-form";
import { Gauge } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Gauge className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-3xl tracking-tight">
            <span className="font-light text-foreground/60">Car</span>
            <span className="font-bold text-primary">Desk</span>
          </span>
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
