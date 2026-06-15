import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string()).default([]),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string()).default([]),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  currentPassword: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
