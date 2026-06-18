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
import type { WorkOrderDetail } from "../types";
import type { SettingsData } from "@/modules/settings/types";
import { calcItem, calcLaborItem, calcTotals } from "../lib/calculations";

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
  docBlock: { alignItems: "flex-end", minWidth: 160 },
  docTitle: { fontSize: 20, fontFamily: "NotoSans-Bold", color: BLUE, marginBottom: 6 },
  docMeta: { color: SLATE, marginBottom: 2 },
  docMetaBold: { fontFamily: "NotoSans-Bold", color: "#1e293b" },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-end",
  },
  statusText: { fontSize: 8, fontFamily: "NotoSans-Bold" },
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
  sectionTitle: {
    fontSize: 8,
    fontFamily: "NotoSans-Bold",
    color: SLATE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  problemSection: { marginBottom: 16 },
  problemText: { color: SLATE, lineHeight: 1.5 },
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
  tableRowAlt: { backgroundColor: "#f8fafc" },
  tableCell: { fontSize: 8.5 },
  colNum: { width: 20 },
  colDesc: { flex: 1, paddingRight: 4 },
  colQty: { width: 36, textAlign: "right" },
  colUnit: { width: 28, textAlign: "center" },
  colPrice: { width: 56, textAlign: "right" },
  colVat: { width: 32, textAlign: "right" },
  colDisc: { width: 32, textAlign: "right" },
  colTotal: { width: 60, textAlign: "right" },
  colHours: { width: 40, textAlign: "right" },
  colRate: { width: 60, textAlign: "right" },
  totalsSection: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 20 },
  totalsBox: { width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalsLabel: { color: SLATE },
  totalsValue: { fontFamily: "NotoSans-Bold" },
  totalsDivider: { borderTopWidth: 1, borderTopColor: BLUE, marginVertical: 4 },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotalLabel: { fontSize: 10, fontFamily: "NotoSans-Bold", color: BLUE },
  grandTotalValue: { fontSize: 10, fontFamily: "NotoSans-Bold", color: BLUE },
  notesSection: { marginBottom: 16 },
  notesText: { color: SLATE, lineHeight: 1.5 },
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
  return `${n.toFixed(2).replace(".", ",")} ${symbol}`;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: "#f1f5f9", text: "#475569" },
  IN_PROGRESS: { bg: BLUE_LIGHT, text: BLUE },
  WAITING_PARTS: { bg: "#fef3c7", text: "#92400e" },
  DONE: { bg: "#dcfce7", text: "#166534" },
  INVOICED: { bg: "#ede9fe", text: "#5b21b6" },
  CANCELLED: { bg: "#fee2e2", text: "#991b1b" },
};

type PdfStrings = {
  title: string;
  no: string;
  date: string;
  scheduled: string;
  completed: string;
  customer: string;
  vehicle: string;
  technician: string;
  mileageIn: string;
  mileageOut: string;
  reportedProblem: string;
  parts: string;
  colDescription: string;
  colQty: string;
  colUnit: string;
  colPrice: string;
  colVat: string;
  colDisc: string;
  colTotal: string;
  vatNumber: string;
  labor: string;
  colHours: string;
  colRate: string;
  partsExVat: string;
  laborExVat: string;
  vatLine: (rate: number, base: string) => string;
  grandTotal: string;
  internalNotes: string;
  page: (n: number, total: number) => string;
  statuses: Record<string, string>;
  units: Record<string, string>;
};

const STRINGS: Record<string, PdfStrings> = {
  en: {
    title: "WORK ORDER",
    no: "No:",
    date: "Date:",
    scheduled: "Scheduled:",
    completed: "Completed:",
    customer: "Customer",
    vehicle: "Vehicle",
    technician: "Technician:",
    mileageIn: "Mileage in:",
    mileageOut: "Mileage out:",
    reportedProblem: "Reported Problem",
    parts: "Parts & Materials",
    colDescription: "Description",
    colQty: "Qty",
    colUnit: "Unit",
    colPrice: "Price",
    colVat: "VAT%",
    colDisc: "Disc%",
    colTotal: "Total",
    vatNumber: "VAT No:",
    labor: "Labor",
    colHours: "Hours",
    colRate: "Rate/h",
    partsExVat: "Parts (ex. VAT)",
    laborExVat: "Labor (ex. VAT)",
    vatLine: (rate, base) => `VAT ${rate}% on ${base}`,
    grandTotal: "TOTAL",
    internalNotes: "Internal Notes",
    page: (n, total) => `Page ${n} / ${total}`,
    statuses: {
      OPEN: "Open",
      IN_PROGRESS: "In Progress",
      WAITING_PARTS: "Waiting Parts",
      DONE: "Done",
      INVOICED: "Invoiced",
      CANCELLED: "Cancelled",
    },
    units: { pcs: "pcs", h: "h", m: "m", kg: "kg", l: "l", set: "set", pair: "pair" },
  },
  sl: {
    title: "DELOVNI NALOG",
    no: "Št.:",
    date: "Datum:",
    scheduled: "Načrtovano:",
    completed: "Zaključeno:",
    customer: "Stranka",
    vehicle: "Vozilo",
    technician: "Serviser:",
    mileageIn: "Km ob prevzemu:",
    mileageOut: "Km ob oddaji:",
    reportedProblem: "Opisana napaka",
    parts: "Deli in material",
    colDescription: "Opis",
    colQty: "Kol.",
    colUnit: "Enota",
    colPrice: "Cena",
    colVat: "DDV%",
    colDisc: "Pop.%",
    colTotal: "Skupaj",
    vatNumber: "ID za DDV:",
    labor: "Delo",
    colHours: "Ure",
    colRate: "Cena/h",
    partsExVat: "Deli (brez DDV)",
    laborExVat: "Delo (brez DDV)",
    vatLine: (rate, base) => `DDV ${rate}% na ${base}`,
    grandTotal: "SKUPAJ",
    internalNotes: "Interne opombe",
    page: (n, total) => `Stran ${n} / ${total}`,
    statuses: {
      OPEN: "Odprt",
      IN_PROGRESS: "V delu",
      WAITING_PARTS: "Čaka na dele",
      DONE: "Zaključen",
      INVOICED: "Fakturiran",
      CANCELLED: "Preklican",
    },
    units: { pcs: "kos", h: "ura", m: "m", kg: "kg", l: "l", set: "komplet", pair: "par" },
  },
};

export type WorkOrderPDFProps = {
  workOrder: WorkOrderDetail;
  settings: SettingsData;
};

export function WorkOrderPDF({ workOrder, settings }: WorkOrderPDFProps) {
  const s = STRINGS[settings.defaultLanguage] ?? STRINGS.en;
  const currency = settings.currency;
  const totals = calcTotals(workOrder.items, workOrder.laborItems);
  const statusColor = STATUS_COLORS[workOrder.status] ?? STATUS_COLORS.OPEN;
  const customerName = workOrder.customer.companyName
    ? workOrder.customer.companyName
    : `${workOrder.customer.firstName} ${workOrder.customer.lastName}`;

  return (
    <Document
      title={workOrder.number}
      author={settings.companyName}
      subject="Work Order"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
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
              <Text style={styles.companyDetail}>{s.vatNumber} {settings.companyVAT}</Text>
            ) : null}
            {settings.companyEmail ? (
              <Text style={styles.companyDetail}>{settings.companyEmail}</Text>
            ) : null}
            {settings.companyPhone ? (
              <Text style={styles.companyDetail}>{settings.companyPhone}</Text>
            ) : null}
          </View>

          <View style={styles.docBlock}>
            <Text style={styles.docTitle}>{s.title}</Text>
            <Text style={styles.docMeta}>
              <Text style={styles.docMetaBold}>{s.no} </Text>
              {workOrder.number}
            </Text>
            <Text style={styles.docMeta}>
              <Text style={styles.docMetaBold}>{s.date} </Text>
              {fmtDate(workOrder.createdAt)}
            </Text>
            {workOrder.scheduledAt ? (
              <Text style={styles.docMeta}>
                <Text style={styles.docMetaBold}>{s.scheduled} </Text>
                {fmtDate(workOrder.scheduledAt)}
              </Text>
            ) : null}
            {workOrder.completedAt ? (
              <Text style={styles.docMeta}>
                <Text style={styles.docMetaBold}>{s.completed} </Text>
                {fmtDate(workOrder.completedAt)}
              </Text>
            ) : null}
            {workOrder.technician ? (
              <Text style={styles.docMeta}>
                <Text style={styles.docMetaBold}>{s.technician} </Text>
                {workOrder.technician.name ?? workOrder.technician.email}
              </Text>
            ) : null}
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {s.statuses[workOrder.status] ?? workOrder.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer + Vehicle */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>{s.customer}</Text>
            <Text style={[styles.infoLine, styles.infoBold]}>{customerName}</Text>
            {workOrder.customer.companyName ? (
              <Text style={styles.infoLine}>
                {workOrder.customer.firstName} {workOrder.customer.lastName}
              </Text>
            ) : null}
            {workOrder.customer.email ? (
              <Text style={styles.infoLine}>{workOrder.customer.email}</Text>
            ) : null}
            {workOrder.customer.phone ? (
              <Text style={styles.infoLine}>{workOrder.customer.phone}</Text>
            ) : null}
          </View>

          {workOrder.vehicle ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{s.vehicle}</Text>
              <Text style={[styles.infoLine, styles.infoBold]}>
                {workOrder.vehicle.make} {workOrder.vehicle.model} ({workOrder.vehicle.year})
              </Text>
              {workOrder.vehicle.registrationPlate ? (
                <Text style={styles.infoLine}>Reg: {workOrder.vehicle.registrationPlate}</Text>
              ) : null}
              {workOrder.vehicle.vin ? (
                <Text style={styles.infoLine}>VIN: {workOrder.vehicle.vin}</Text>
              ) : null}
              {workOrder.mileageIn != null ? (
                <Text style={styles.infoLine}>
                  {s.mileageIn} {workOrder.mileageIn.toLocaleString("sl-SI")} km
                </Text>
              ) : null}
              {workOrder.mileageOut != null ? (
                <Text style={styles.infoLine}>
                  {s.mileageOut} {workOrder.mileageOut.toLocaleString("sl-SI")} km
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

        {/* Reported problem */}
        {workOrder.reportedProblem ? (
          <View style={styles.problemSection}>
            <Text style={styles.sectionTitle}>{s.reportedProblem}</Text>
            <Text style={styles.problemText}>{workOrder.reportedProblem}</Text>
          </View>
        ) : null}

        {/* Parts table */}
        {workOrder.items.length > 0 ? (
          <View style={styles.table}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>{s.parts}</Text>
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
            {workOrder.items.map((item, idx) => {
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
                  <Text style={[styles.tableCell, styles.colUnit]}>{s.units[item.unit] ?? item.unit}</Text>
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
        ) : null}

        {/* Labor table */}
        {workOrder.laborItems.length > 0 ? (
          <View style={styles.table}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>{s.labor}</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>{s.colDescription}</Text>
              <Text style={[styles.tableHeaderCell, styles.colHours]}>{s.colHours}</Text>
              <Text style={[styles.tableHeaderCell, styles.colRate]}>{s.colRate}</Text>
              <Text style={[styles.tableHeaderCell, styles.colVat]}>{s.colVat}</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>{s.colTotal}</Text>
            </View>
            {workOrder.laborItems.map((labor, idx) => {
              const calc = calcLaborItem(labor);
              return (
                <View
                  key={labor.id}
                  style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
                >
                  <Text style={[styles.tableCell, styles.colNum]}>{idx + 1}</Text>
                  <Text style={[styles.tableCell, styles.colDesc]}>{labor.description}</Text>
                  <Text style={[styles.tableCell, styles.colHours]}>
                    {Number(labor.hours).toFixed(2).replace(/\.00$/, "")}
                  </Text>
                  <Text style={[styles.tableCell, styles.colRate]}>
                    {Number(labor.hourlyRate).toFixed(2).replace(".", ",")}
                  </Text>
                  <Text style={[styles.tableCell, styles.colVat]}>{labor.vatRate}%</Text>
                  <Text style={[styles.tableCell, styles.colTotal]}>
                    {calc.lineTotal.toFixed(2).replace(".", ",")}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Totals */}
        {(workOrder.items.length > 0 || workOrder.laborItems.length > 0) ? (
          <View style={styles.totalsSection}>
            <View style={styles.totalsBox}>
              {totals.partsSubtotalExVat > 0 && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>{s.partsExVat}</Text>
                  <Text style={styles.totalsValue}>{fmtNum(totals.partsSubtotalExVat, currency)}</Text>
                </View>
              )}
              {totals.laborSubtotalExVat > 0 && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>{s.laborExVat}</Text>
                  <Text style={styles.totalsValue}>{fmtNum(totals.laborSubtotalExVat, currency)}</Text>
                </View>
              )}
              {totals.vatBreakdown.map(({ rate, base, amount }) => (
                <View key={rate} style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>
                    {s.vatLine(rate, base.toFixed(2).replace(".", ","))}
                  </Text>
                  <Text style={styles.totalsValue}>{fmtNum(amount, currency)}</Text>
                </View>
              ))}
              <View style={styles.totalsDivider} />
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>{s.grandTotal}</Text>
                <Text style={styles.grandTotalValue}>{fmtNum(totals.grandTotal, currency)}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Internal notes */}
        {workOrder.internalNotes ? (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>{s.internalNotes}</Text>
            <Text style={styles.notesText}>{workOrder.internalNotes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {settings.pdfFooterText || `${settings.companyName} — ${workOrder.number}`}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => s.page(pageNumber, totalPages)}
          />
        </View>
      </Page>
    </Document>
  );
}
