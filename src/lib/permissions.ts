export const MODULES = [
  "customers",
  "products",
  "pricelist",
  "offers",
  "work_orders",
  "import",
  "reports",
  "audit",
  "settings",
  "users",
  "backup",
  "parts_catalog",
] as const;

export type Module = (typeof MODULES)[number];

export const MODULE_LABELS: Record<Module, string> = {
  customers: "Customers & Vehicles",
  products: "Products",
  pricelist: "Pricelist",
  offers: "Offers",
  work_orders: "Work Orders",
  import: "Import",
  reports: "Reports",
  audit: "Audit Log",
  settings: "Settings",
  users: "Users",
  backup: "Backup",
  parts_catalog: "Parts Catalog",
};

export const DEFAULT_EMPLOYEE_PERMISSIONS: Module[] = [
  "customers",
  "products",
  "pricelist",
  "offers",
  "work_orders",
  "reports",
];

export function canAccess(
  user: { role: string; permissions?: string[] | null },
  module: Module
): boolean {
  if (user.role === "ADMIN") return true;
  return user.permissions?.includes(module) ?? false;
}
