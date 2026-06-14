import React from "react";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import type { OfferDetail } from "../types";
import type { SettingsData } from "@/modules/settings/types";
import { calcItem, calcTotals } from "../lib/calculations";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
Font.register({ family: "NotoSans", src: path.join(FONTS_DIR, "NotoSans-Regular.ttf") });
Font.register({ family: "NotoSans-Bold", src: path.join(FONTS_DIR, "NotoSans-Bold.ttf") });
Font.registerHyphenationCallback((word) => [word]);

const BLUE = "#1e3a5f";
const BLUE_LIGHT = "#dbeafe";
const SLATE = "#475569";
const BORDER = "#e2e8f0";
const WHITE = "#ffffff";

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 9,
    color: "#1e293b",
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: BLUE,
    paddingBottom: 16,
  },
  companyBlock: { flex: 1, paddingRight: 16 },
  companyName: { fontSize: 16, fontFamily: "NotoSans-Bold", color: BLUE, marginBottom: 4 },
  companyDetail: { color: SLATE, marginBottom: 2 },
  logo: { width: 100, height: 40, objectFit: "contain", marginBottom: 6 },
  offerBlock: { alignItems: "flex-end", minWidth: 160 },
  offerTitle: { fontSize: 20, fontFamily: "NotoSans-Bold", color: BLUE, marginBottom: 6 },
  offerMeta: { color: SLATE, marginBottom: 2 },
  offerMetaBold: { fontFamily: "NotoSans-Bold", color: "#1e293b" },
  // Status badge
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-end",
  },
  statusText: { fontSize: 8, fontFamily: "NotoSans-Bold" },
  // Info cards
  infoRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 10,
  },
  infoCardTitle: {
    fontSize: 7,
    fontFamily: "NotoSans-Bold",
    color: SLATE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  infoLine: { marginBottom: 2 },
  infoBold: { fontFamily: "NotoSans-Bold" },
  // Items table
  table: { marginBottom: 16 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BLUE,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 1,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "NotoSans-Bold",
    color: WHITE,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  tableCell: { fontSize: 8.5 },
  // Column widths
  colNum: { width: 20 },
  colDesc: { flex: 1, paddingRight: 4 },
  colQty: { width: 36, textAlign: "right" },
  colUnit: { width: 28, textAlign: "center" },
  colPrice: { width: 56, textAlign: "right" },
  colVat: { width: 32, textAlign: "right" },
  colDisc: { width: 32, textAlign: "right" },
  colTotal: { width: 60, textAlign: "right" },
  // Totals
  totalsSection: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 20 },
  totalsBox: { width: 200 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalsLabel: { color: SLATE },
  totalsValue: { fontFamily: "NotoSans-Bold" },
  totalsDivider: { borderTopWidth: 1, borderTopColor: BLUE, marginVertical: 4 },
  discountValue: { fontFamily: "NotoSans-Bold", color: "#16a34a" },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotalLabel: { fontSize: 10, fontFamily: "NotoSans-Bold", color: BLUE },
  grandTotalValue: { fontSize: 10, fontFamily: "NotoSans-Bold", color: BLUE },
  // Notes
  notesSection: { marginBottom: 20 },
  notesTitle: {
    fontSize: 8,
    fontFamily: "NotoSans-Bold",
    color: SLATE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: { color: SLATE, lineHeight: 1.5 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 7.5, color: SLATE },
});

const fmtDate = (d: Date | string | null | undefined): string => {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, "0")}.${(dt.getMonth() + 1).toString().padStart(2, "0")}.${dt.getFullYear()}`;
};

const fmtNum = (n: number, currency = "EUR"): string => {
  const symbol = currency === "EUR" ? "€" : currency;
  const formatted = n.toFixed(2).replace(".", ",");
  return `${formatted} ${symbol}`;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "#f1f5f9", text: "#475569" },
  SENT: { bg: BLUE_LIGHT, text: BLUE },
  APPROVED: { bg: "#dcfce7", text: "#166534" },
  REJECTED: { bg: "#fee2e2", text: "#991b1b" },
  COMPLETED: { bg: "#ede9fe", text: "#5b21b6" },
};

type PdfStrings = {
  title: string;
  no: string;
  date: string;
  validUntil: string;
  customer: string;
  vehicle: string;
  mileage: string;
  colDescription: string;
  colQty: string;
  colUnit: string;
  colPrice: string;
  colVat: string;
  colDisc: string;
  colTotal: string;
  subtotal: string;
  discount: string;
  vatLine: (rate: number, base: string) => string;
  grandTotal: string;
  notes: string;
  terms: string;
  page: (n: number, total: number) => string;
  statuses: Record<string, string>;
};

const STRINGS: Record<string, PdfStrings> = {
  en: {
    title: "OFFER",
    no: "No:",
    date: "Date:",
    validUntil: "Valid until:",
    customer: "Customer",
    vehicle: "Vehicle",
    mileage: "Mileage:",
    colDescription: "Description",
    colQty: "Qty",
    colUnit: "Unit",
    colPrice: "Price",
    colVat: "VAT%",
    colDisc: "Disc%",
    colTotal: "Total",
    subtotal: "Subtotal (ex. VAT)",
    discount: "Discount",
    vatLine: (rate, base) => `VAT ${rate}% on ${base}`,
    grandTotal: "TOTAL",
    notes: "Notes",
    terms: "Terms & Conditions",
    page: (n, total) => `Page ${n} / ${total}`,
    statuses: {
      DRAFT: "Draft",
      SENT: "Sent",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      COMPLETED: "Completed",
    },
  },
  sl: {
    title: "PONUDBA",
    no: "Št.:",
    date: "Datum:",
    validUntil: "Veljavno do:",
    customer: "Stranka",
    vehicle: "Vozilo",
    mileage: "Kilometraža:",
    colDescription: "Opis",
    colQty: "Kol.",
    colUnit: "Enota",
    colPrice: "Cena",
    colVat: "DDV%",
    colDisc: "Pop.%",
    colTotal: "Skupaj",
    subtotal: "Skupaj (brez DDV)",
    discount: "Popust",
    vatLine: (rate, base) => `DDV ${rate}% na ${base}`,
    grandTotal: "SKUPAJ",
    notes: "Opombe",
    terms: "Splošni pogoji",
    page: (n, total) => `Stran ${n} / ${total}`,
    statuses: {
      DRAFT: "Osnutek",
      SENT: "Poslano",
      APPROVED: "Potrjeno",
      REJECTED: "Zavrnjeno",
      COMPLETED: "Zaključeno",
    },
  },
};

export type OfferPDFProps = {
  offer: OfferDetail;
  settings: SettingsData;
};

export function OfferPDF({ offer, settings }: OfferPDFProps) {
  const s = STRINGS[settings.defaultLanguage] ?? STRINGS.en;
  const totals = calcTotals(offer.items);
  const statusColor = STATUS_COLORS[offer.status] ?? STATUS_COLORS.DRAFT;
  const customerName = offer.customer.companyName
    ? offer.customer.companyName
    : `${offer.customer.firstName} ${offer.customer.lastName}`;

  return (
    <Document
      title={offer.offerNumber}
      author={settings.companyName}
      subject="Offer"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            {settings.companyLogo ? (
              <Image src={settings.companyLogo} style={styles.logo} />
            ) : null}
            <Text style={styles.companyName}>{settings.companyName || "CarDesk"}</Text>
            {settings.companyAddress ? (
              <Text style={styles.companyDetail}>{settings.companyAddress}</Text>
            ) : null}
            {settings.companyVAT ? (
              <Text style={styles.companyDetail}>VAT: {settings.companyVAT}</Text>
            ) : null}
            {settings.companyEmail ? (
              <Text style={styles.companyDetail}>{settings.companyEmail}</Text>
            ) : null}
            {settings.companyPhone ? (
              <Text style={styles.companyDetail}>{settings.companyPhone}</Text>
            ) : null}
          </View>

          <View style={styles.offerBlock}>
            <Text style={styles.offerTitle}>{s.title}</Text>
            <Text style={styles.offerMeta}>
              <Text style={styles.offerMetaBold}>{s.no} </Text>
              {offer.offerNumber}
            </Text>
            <Text style={styles.offerMeta}>
              <Text style={styles.offerMetaBold}>{s.date} </Text>
              {fmtDate(offer.createdAt)}
            </Text>
            {offer.validUntil ? (
              <Text style={styles.offerMeta}>
                <Text style={styles.offerMetaBold}>{s.validUntil} </Text>
                {fmtDate(offer.validUntil)}
              </Text>
            ) : null}
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {s.statuses[offer.status] ?? offer.status}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Customer + Vehicle ── */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>{s.customer}</Text>
            <Text style={[styles.infoLine, styles.infoBold]}>{customerName}</Text>
            {offer.customer.companyName ? (
              <Text style={styles.infoLine}>
                {offer.customer.firstName} {offer.customer.lastName}
              </Text>
            ) : null}
            {offer.customer.taxNumber ? (
              <Text style={styles.infoLine}>VAT: {offer.customer.taxNumber}</Text>
            ) : null}
            {offer.customer.address ? (
              <Text style={styles.infoLine}>{offer.customer.address}</Text>
            ) : null}
            {offer.customer.city || offer.customer.postalCode ? (
              <Text style={styles.infoLine}>
                {[offer.customer.postalCode, offer.customer.city].filter(Boolean).join(" ")}
              </Text>
            ) : null}
            {offer.customer.country !== "SI" ? (
              <Text style={styles.infoLine}>{offer.customer.country}</Text>
            ) : null}
            {offer.customer.email ? (
              <Text style={styles.infoLine}>{offer.customer.email}</Text>
            ) : null}
            {offer.customer.phone ? (
              <Text style={styles.infoLine}>{offer.customer.phone}</Text>
            ) : null}
          </View>

          {offer.vehicle ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{s.vehicle}</Text>
              <Text style={[styles.infoLine, styles.infoBold]}>
                {offer.vehicle.make} {offer.vehicle.model} ({offer.vehicle.year})
              </Text>
              {offer.vehicle.registrationPlate ? (
                <Text style={styles.infoLine}>Reg: {offer.vehicle.registrationPlate}</Text>
              ) : null}
              {offer.vehicle.vin ? (
                <Text style={styles.infoLine}>VIN: {offer.vehicle.vin}</Text>
              ) : null}
              {offer.mileage != null ? (
                <Text style={styles.infoLine}>
                  {s.mileage} {offer.mileage.toLocaleString("sl-SI")} km
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={[styles.infoCard, { backgroundColor: "#f8fafc" }]}>
              <Text style={styles.infoCardTitle}>{s.vehicle}</Text>
              <Text style={{ color: SLATE }}>—</Text>
            </View>
          )}
        </View>

        {/* ── Items Table ── */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>{s.colDescription}</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>{s.colQty}</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>{s.colUnit}</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>{s.colPrice}</Text>
            <Text style={[styles.tableHeaderCell, styles.colVat]}>{s.colVat}</Text>
            <Text style={[styles.tableHeaderCell, styles.colDisc]}>{s.colDisc}</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>{s.colTotal}</Text>
          </View>

          {offer.items.map((item, idx) => {
            const calc = calcItem(item);
            return (
              <View
                key={item.id}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, styles.colNum]}>{idx + 1}</Text>
                <View style={styles.colDesc}>
                  {item.productNumber ? (
                    <Text style={{ fontSize: 7, color: SLATE }}>{item.productNumber}</Text>
                  ) : null}
                  <Text style={styles.tableCell}>{item.description}</Text>
                </View>
                <Text style={[styles.tableCell, styles.colQty]}>
                  {Number(item.quantity).toFixed(2).replace(/\.00$/, "")}
                </Text>
                <Text style={[styles.tableCell, styles.colUnit]}>{item.unit}</Text>
                <Text style={[styles.tableCell, styles.colPrice]}>
                  {Number(item.pricePerUnit).toFixed(2).replace(".", ",")}
                </Text>
                <Text style={[styles.tableCell, styles.colVat]}>{item.vatRate}%</Text>
                <Text style={[styles.tableCell, styles.colDisc]}>
                  {Number(item.discount) > 0 ? `${item.discount}%` : "—"}
                </Text>
                <Text style={[styles.tableCell, styles.colTotal]}>
                  {calc.lineTotal.toFixed(2).replace(".", ",")}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Totals ── */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{s.subtotal}</Text>
              <Text style={styles.totalsValue}>
                {fmtNum(totals.subtotalExVat, offer.currency)}
              </Text>
            </View>
            {totals.totalDiscount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{s.discount}</Text>
                <Text style={styles.discountValue}>
                  -{fmtNum(totals.totalDiscount, offer.currency)}
                </Text>
              </View>
            )}
            {totals.vatBreakdown.map(({ rate, base, amount }) => (
              <View key={rate} style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  {s.vatLine(rate, base.toFixed(2).replace(".", ","))}
                </Text>
                <Text style={styles.totalsValue}>{fmtNum(amount, offer.currency)}</Text>
              </View>
            ))}
            <View style={styles.totalsDivider} />
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>{s.grandTotal}</Text>
              <Text style={styles.grandTotalValue}>
                {fmtNum(totals.grandTotal, offer.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {offer.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>{s.notes}</Text>
            <Text style={styles.notesText}>{offer.notes}</Text>
          </View>
        ) : null}

        {/* ── T&C ── */}
        {settings.termsAndConditions ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>{s.terms}</Text>
            <Text style={[styles.notesText, { fontSize: 7.5 }]}>
              {settings.termsAndConditions}
            </Text>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {settings.pdfFooterText ||
              `${settings.companyName} — ${offer.offerNumber}`}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              s.page(pageNumber, totalPages)
            }
          />
        </View>
      </Page>
    </Document>
  );
}
