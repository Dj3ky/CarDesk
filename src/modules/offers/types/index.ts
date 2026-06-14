export type OfferStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "COMPLETED";

export type OfferItemData = {
  id: string;
  position: number;
  productId: string | null;
  productNumber: string | null;
  description: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
  vatRate: string;
  discount: string;
};

export type OfferCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  taxNumber: string | null;
};

export type OfferVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  registrationPlate: string | null;
  vin: string | null;
};

export type OfferDetail = {
  id: string;
  offerNumber: string;
  status: OfferStatus;
  customerId: string;
  vehicleId: string | null;
  mileage: number | null;
  currency: string;
  notes: string | null;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: OfferCustomer;
  vehicle: OfferVehicle | null;
  createdBy: { id: string; name: string | null } | null;
  items: OfferItemData[];
};

export type OfferListItem = {
  id: string;
  offerNumber: string;
  status: OfferStatus;
  currency: string;
  createdAt: Date;
  validUntil: Date | null;
  customer: { firstName: string; lastName: string; companyName: string | null };
  vehicle: { make: string; model: string; year: number } | null;
  grandTotal: number;
  itemCount: number;
};

export type CustomerOption = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  defaultDiscount: number | null;
};

export type VehicleOption = {
  id: string;
  make: string;
  model: string;
  year: number;
  registrationPlate: string | null;
};

export type ProductSearchResult = {
  id: string;
  productNumber: string;
  description: string;
  brand: string | null;
  substitutionPart: string | null;
  price: string;
  adjustedPrice?: string; // Price after applying a matching PriceRule
  vatRate: string;
  unit: string;
};

export type ActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
