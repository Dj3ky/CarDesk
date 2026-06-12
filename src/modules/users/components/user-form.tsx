"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { createUserSchema, updateUserSchema } from "../schemas/user.schema";
import { createUser } from "../actions/create-user";
import { updateUser } from "../actions/update-user";
import type { CreateUserFormValues, UpdateUserFormValues } from "../schemas/user.schema";
import type { UserListItem } from "../types";

interface UserFormProps {
  user?: UserListItem;
}

export function UserForm({ user }: UserFormProps) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!user;
  const schema = isEdit ? updateUserSchema : createUserSchema;

  const form = useForm<CreateUserFormValues | UpdateUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      role: user?.role ?? "EMPLOYEE",
      isActive: user?.isActive ?? true,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const isActive = watch("isActive");

  function onSubmit(values: CreateUserFormValues | UpdateUserFormValues) {
    startTransition(async () => {
      setError(null);
      const result = isEdit
        ? await updateUser(user.id, values)
        : await createUser(values);

      if (!result.success) {
        const key = result.error as Parameters<typeof t>[0];
        setError(t.has(key) ? t(key) : result.error);
        return;
      }

      if (!isEdit && (result as { data?: { id: string } }).data?.id) {
        router.push(`/${locale}/users`);
      } else {
        router.push(`/${locale}/users`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isEdit ? t("editTitle") : t("newTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              {t("fields.name")} <span className="text-destructive">*</span>
            </Label>
            <Input id="name" {...register("name")} autoComplete="name" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              {t("fields.email")} <span className="text-destructive">*</span>
            </Label>
            <Input id="email" type="email" {...register("email")} autoComplete="email" />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              {t("fields.password")}
              {isEdit ? null : <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              autoComplete={isEdit ? "new-password" : "new-password"}
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">{t("fields.passwordHint")}</p>
            )}
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">{t("fields.role")}</Label>
            <select
              id="role"
              {...register("role")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="EMPLOYEE">{tc("employee")}</option>
              <option value="ADMIN">{tc("admin")}</option>
            </select>
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue("isActive", checked === true)}
              className="mt-0.5"
            />
            <div>
              <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                {t("fields.isActive")}
              </label>
              <p className="text-xs text-muted-foreground">{t("fields.isActiveHint")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
