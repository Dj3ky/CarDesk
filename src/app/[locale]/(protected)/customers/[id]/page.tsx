import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import {
  ChevronLeft,
  Pencil,
  Mail,
  Phone,
  Smartphone,
  MapPin,
  Building2,
  FileText,
  Car,
  User,
  CalendarDays,
  Plus,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteCustomerDialog } from "@/modules/customers/components/delete-customer-dialog";
import { VehicleList } from "@/modules/vehicles/components/vehicle-list";
import { CustomerOfferList } from "@/modules/offers/components/customer-offer-list";
import { getCustomer } from "@/modules/customers/actions/get-customer";

interface CustomerDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: CustomerDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) return { title: "Not found" };
  return { title: `${customer.firstName} ${customer.lastName}` };
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations();
  const session = await auth();
  const customer = await getCustomer(id);

  if (!customer) notFound();

  const fullName = `${customer.firstName} ${customer.lastName}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/customers`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("customers.title")}
          </Link>
        </Button>
      </div>

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {customer.firstName[0]}{customer.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
              <Badge variant={customer.isActive ? "default" : "secondary"}>
                {customer.isActive ? t("common.active") : t("common.inactive")}
              </Badge>
            </div>
            {customer.companyName && (
              <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-sm">{customer.companyName}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/customers/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              {t("common.edit")}
            </Link>
          </Button>
          {session?.user?.role === "ADMIN" && (
            <DeleteCustomerDialog customerId={id} customerName={fullName} />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — contact + address */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("customers.sections.contact")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.email ? (
                <DetailRow icon={<Mail className="h-4 w-4" />} label={t("customers.fields.email")}>
                  <a href={`mailto:${customer.email}`} className="hover:underline">
                    {customer.email}
                  </a>
                </DetailRow>
              ) : (
                <DetailRow icon={<Mail className="h-4 w-4" />} label={t("customers.fields.email")}>
                  <span className="text-muted-foreground">—</span>
                </DetailRow>
              )}
              <DetailRow icon={<Phone className="h-4 w-4" />} label={t("customers.fields.phone")}>
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="hover:underline">
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              <DetailRow icon={<Smartphone className="h-4 w-4" />} label={t("customers.fields.mobile")}>
                {customer.mobile ? (
                  <a href={`tel:${customer.mobile}`} className="hover:underline">
                    {customer.mobile}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("customers.sections.address")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow icon={<MapPin className="h-4 w-4" />} label={t("customers.fields.address")}>
                {customer.address || customer.city || customer.postalCode ? (
                  <span>
                    {[customer.address, `${customer.postalCode ?? ""} ${customer.city ?? ""}`.trim(), customer.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
            </CardContent>
          </Card>

          {/* Company */}
          {(customer.companyName || customer.taxNumber) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("customers.sections.company")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.companyName && (
                  <DetailRow icon={<Building2 className="h-4 w-4" />} label={t("customers.fields.companyName")}>
                    {customer.companyName}
                  </DetailRow>
                )}
                {customer.taxNumber && (
                  <DetailRow icon={<FileText className="h-4 w-4" />} label={t("customers.fields.taxNumber")}>
                    {customer.taxNumber}
                  </DetailRow>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes & discount */}
          {(customer.notes || customer.defaultDiscount != null) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("customers.sections.notes")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.defaultDiscount != null && parseFloat(String(customer.defaultDiscount)) > 0 && (
                  <DetailRow icon={<FileText className="h-4 w-4" />} label={t("customers.fields.defaultDiscount")}>
                    {parseFloat(String(customer.defaultDiscount)).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} %
                  </DetailRow>
                )}
                {customer.notes && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — vehicles + meta */}
        <div className="space-y-6">
          {/* Vehicles */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4" />
                {t("customers.vehicles")}
                {customer._count.vehicles > 0 && (
                  <Badge variant="secondary">{customer._count.vehicles}</Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${locale}/customers/${id}/vehicles/new`}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t("vehicles.add")}
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <VehicleList customerId={id} locale={locale} />
            </CardContent>
          </Card>

          {/* Meta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("customers.sections.meta")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow icon={<CalendarDays className="h-4 w-4" />} label={t("customers.fields.createdAt")}>
                {new Date(customer.createdAt).toLocaleDateString(locale, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </DetailRow>
              <DetailRow icon={<CalendarDays className="h-4 w-4" />} label={t("customers.fields.updatedAt")}>
                {new Date(customer.updatedAt).toLocaleDateString(locale, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </DetailRow>
              {customer.createdBy && (
                <DetailRow icon={<User className="h-4 w-4" />} label={t("customers.fields.createdBy")}>
                  {customer.createdBy.name ?? customer.createdBy.email}
                </DetailRow>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Offers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            {t("customers.offers")}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${locale}/offers/new?customerId=${id}`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("offers.addNew")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <CustomerOfferList customerId={id} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
          {label}
        </div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
