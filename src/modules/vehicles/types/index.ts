import type { Vehicle, FuelType } from "@prisma/client";

export type { FuelType };

export type VehicleListItem = Pick<
  Vehicle,
  | "id"
  | "customerId"
  | "make"
  | "model"
  | "year"
  | "registrationPlate"
  | "fuelType"
  | "mileage"
  | "color"
  | "isActive"
  | "createdAt"
>;

export type VehicleDetail = Vehicle & {
  customer: { id: string; firstName: string; lastName: string };
  createdBy: { id: string; name: string | null; email: string } | null;
};

export type ActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
