export type SettingsData = {
  id: string;
  companyName: string;
  companyVAT: string | null;
  companyAddress: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyLogo: string | null;
  defaultVATRate: string; // Decimal serialised as string
  defaultLanguage: string;
  currency: string;
  offerPrefix: string;
  invoicePrefix: string;
  workOrderPrefix: string;
  pdfFooterText: string | null;
  termsAndConditions: string | null;
  partsCatalogApiKey: string | null;
  updatedAt: Date;
};

export type ActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
