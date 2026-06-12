"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateProfileSchema, type UpdateProfileFormValues } from "../schemas/user.schema";
import { updateProfile } from "../actions/update-profile";

interface ProfileFormProps {
  name: string | null;
  email: string;
}

export function ProfileForm({ name, email }: ProfileFormProps) {
  const t = useTranslations("users.profile");
  const tFields = useTranslations("users.fields");
  const tc = useTranslations("common");
  const tu = useTranslations("users");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: name ?? "", currentPassword: "", newPassword: "" },
  });

  const { register, handleSubmit, reset, formState: { errors } } = form;

  function onSubmit(values: UpdateProfileFormValues) {
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const result = await updateProfile(values);
      if (!result.success) {
        const key = result.error as Parameters<typeof tu>[0];
        setError(tu.has(key) ? tu(key) : result.error);
        return;
      }
      setSaved(true);
      reset({ name: values.name, currentPassword: "", newPassword: "" });
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("accountInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{tFields("name")}</Label>
            <Input id="name" {...register("name")} autoComplete="name" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>{tFields("email")}</Label>
            <Input value={email} disabled className="bg-muted" />
          </div>
          <p className="text-xs text-muted-foreground">{t("sessionNote")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("changePassword")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
            <Input
              id="currentPassword"
              type="password"
              {...register("currentPassword")}
              autoComplete="current-password"
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">{t("newPassword")}</Label>
            <Input
              id="newPassword"
              type="password"
              {...register("newPassword")}
              autoComplete="new-password"
            />
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {tc("save")} ✓
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("saveProfile")}
        </Button>
      </div>
    </form>
  );
}
