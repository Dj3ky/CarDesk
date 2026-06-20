import { z } from "zod";

type TFn = (key: string) => string;

const englishT: TFn = (key) => {
  const m: Record<string, string> = {
    passwordMinLength: "Password must be at least 8 characters",
    newPasswordMinLength: "New password must be at least 8 characters",
  };
  return m[key] ?? key;
};

function createUserSchemaWith(t: TFn) {
  return z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(8, t("passwordMinLength")),
    role: z.enum(["ADMIN", "EMPLOYEE"]),
    isActive: z.boolean().default(true),
    permissions: z.array(z.string()).default([]),
    language: z.enum(["en", "sl"]).default("en"),
  });
}

function updateUserSchemaWith(t: TFn) {
  return z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z
      .string()
      .min(8, t("passwordMinLength"))
      .optional()
      .or(z.literal(""))
      .transform((v) => v || undefined),
    role: z.enum(["ADMIN", "EMPLOYEE"]),
    isActive: z.boolean().default(true),
    permissions: z.array(z.string()).default([]),
    language: z.enum(["en", "sl"]).default("en"),
  });
}

function updateProfileSchemaWith(t: TFn) {
  return z.object({
    name: z.string().min(1).max(100),
    language: z.enum(["en", "sl"]).default("en"),
    currentPassword: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => v || undefined),
    newPassword: z
      .string()
      .min(8, t("newPasswordMinLength"))
      .optional()
      .or(z.literal(""))
      .transform((v) => v || undefined),
  });
}

export const createUserSchema = createUserSchemaWith(englishT);
export const updateUserSchema = updateUserSchemaWith(englishT);
export const updateProfileSchema = updateProfileSchemaWith(englishT);

export function createLocalizedCreateUserSchema(t: TFn) {
  return createUserSchemaWith(t);
}

export function createLocalizedUpdateUserSchema(t: TFn) {
  return updateUserSchemaWith(t);
}

export function createLocalizedUpdateProfileSchema(t: TFn) {
  return updateProfileSchemaWith(t);
}

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
