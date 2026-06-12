import type { Customer } from "@prisma/client";

export type CustomerListItem = Pick<
  Customer,
  | "id"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "mobile"
  | "companyName"
  | "city"
  | "isActive"
  | "createdAt"
>;

export type CustomerDetail = Customer & {
  createdBy: { id: string; name: string | null; email: string } | null;
  _count: { vehicles: number };
};

export type CustomerListResult = {
  customers: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
