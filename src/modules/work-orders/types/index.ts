export type WorkOrderStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_PARTS"
  | "DONE"
  | "INVOICED"
  | "CANCELLED";

export type WorkOrderListItem = {
  id: string;
  number: string;
  status: WorkOrderStatus;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  customer: { id: string; firstName: string; lastName: string; companyName: string | null };
  vehicle: { id: string; make: string; model: string; registrationPlate: string | null } | null;
  technician: { id: string; name: string | null } | null;
};

export type WorkOrderDetail = {
  id: string;
  number: string;
  status: WorkOrderStatus;
  customerId: string;
  vehicleId: string | null;
  technicianId: string | null;
  reportedProblem: string | null;
  internalNotes: string | null;
  mileageIn: number | null;
  mileageOut: number | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  offerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    registrationPlate: string | null;
    vin: string | null;
  } | null;
  technician: { id: string; name: string | null; email: string } | null;
  createdBy: { id: string; name: string | null } | null;
  items: WorkOrderItemData[];
  laborItems: LaborItemData[];
};

export type WorkOrderItemData = {
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

export type LaborItemData = {
  id: string;
  position: number;
  description: string;
  hours: string;
  hourlyRate: string;
  vatRate: string;
};

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
