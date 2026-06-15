export type UserRole = "ADMIN" | "EMPLOYEE";

export type UserListItem = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  permissions: string[];
  createdAt: Date;
};

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };
