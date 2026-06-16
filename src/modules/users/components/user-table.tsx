"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil } from "lucide-react";
import { DeleteUserButton } from "./delete-user-button";
import { ToggleStatusButton } from "./toggle-status-button";
import type { UserListItem } from "../types";

interface UserTableProps {
  users: UserListItem[];
  currentUserId: string;
}

function initials(name: string | null, email: string) {
  if (name) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return email[0].toUpperCase();
}

export function UserTable({ users, currentUserId }: UserTableProps) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const locale = useLocale();

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
        {t("noUsers")}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("fields.name")}</TableHead>
            <TableHead>{t("fields.role")}</TableHead>
            <TableHead>{t("fields.isActive")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("fields.createdAt")}</TableHead>
            <TableHead className="w-28 text-right">{tc("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {initials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                  {tc(user.role.toLowerCase() as "admin" | "employee")}
                </Badge>
              </TableCell>
              <TableCell>
                <ToggleStatusButton
                  userId={user.id}
                  isActive={user.isActive}
                  isSelf={user.id === currentUserId}
                />
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <Link href={`/${locale}/users/${user.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <DeleteUserButton
                    userId={user.id}
                    userName={user.name ?? user.email}
                    isSelf={user.id === currentUserId}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
