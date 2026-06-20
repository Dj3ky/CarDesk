import { after } from "next/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck } from "lucide-react";
import { purgeAuditLog } from "@/lib/audit-purge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("audit");
  return { title: t("title") };
}

const PAGE_SIZE = 50;

interface AuditPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; entity?: string; action?: string; user?: string }>;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  STATUS_CHANGE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  LOGIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  LOGIN_FAILED: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

export default async function AuditPage({ params, searchParams }: AuditPageProps) {
  const { locale } = await params;
  const [t, session] = await Promise.all([getTranslations("audit"), auth()]);

  if (!canAccess(session?.user ?? { role: "", permissions: [] }, "audit")) {
    redirect(`/${locale}/dashboard`);
  }

  after(() => purgeAuditLog());

  const { page: pageParam, entity: entityFilter, action: actionFilter, user: userFilter } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(entityFilter ? { entity: entityFilter } : {}),
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(userFilter ? { userId: userFilter } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const [entities, actions, auditUsers] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true } }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true } }),
    prisma.auditLog.findMany({
      where: { userId: { not: null } },
      distinct: ["userId"],
      select: { userId: true, user: { select: { name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3">
        <select
          name="entity"
          defaultValue={entityFilter ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("filters.allEntities")}</option>
          {entities.map((e) => (
            <option key={e.entity} value={e.entity}>
              {e.entity}
            </option>
          ))}
        </select>
        <select
          name="action"
          defaultValue={actionFilter ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("filters.allActions")}</option>
          {actions.map((a) => (
            <option key={a.action} value={a.action}>
              {a.action}
            </option>
          ))}
        </select>
        <select
          name="user"
          defaultValue={userFilter ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("filters.allUsers")}</option>
          {auditUsers.map((u) => (
            <option key={u.userId} value={u.userId!}>
              {u.user?.name ?? u.user?.email ?? u.userId}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("filters.apply")}
        </button>
        {(entityFilter || actionFilter || userFilter) && (
          <a
            href="?"
            className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm text-muted-foreground hover:bg-accent"
          >
            {t("filters.clear")}
          </a>
        )}
      </form>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("totalEntries", { count: total })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">{t("noEntries")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.when")}</TableHead>
                    <TableHead>{t("columns.action")}</TableHead>
                    <TableHead>{t("columns.entity")}</TableHead>
                    <TableHead>{t("columns.record")}</TableHead>
                    <TableHead>{t("columns.user")}</TableHead>
                    <TableHead>{t("columns.details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("sl-SI", { timeZone: "Europe/Ljubljana" })}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.entity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entityLabel ?? log.entityId.slice(0, 8) + "…"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user ? (log.user.name ?? log.user.email) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.changes
                          ? (() => {
                              const c = log.changes as Record<string, unknown>;
                              if (c.from && c.to) return `${c.from} → ${c.to}`;
                              return JSON.stringify(c);
                            })()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t("pagination.page", { page, total: totalPages })}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?page=${page - 1}${entityFilter ? `&entity=${entityFilter}` : ""}${actionFilter ? `&action=${actionFilter}` : ""}${userFilter ? `&user=${userFilter}` : ""}`}
                className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs hover:bg-accent"
              >
                {t("pagination.prev")}
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?page=${page + 1}${entityFilter ? `&entity=${entityFilter}` : ""}${actionFilter ? `&action=${actionFilter}` : ""}${userFilter ? `&user=${userFilter}` : ""}`}
                className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs hover:bg-accent"
              >
                {t("pagination.next")}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
