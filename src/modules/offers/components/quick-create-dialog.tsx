"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, Car, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCustomer } from "@/modules/customers/actions/create-customer";
import { createVehicle } from "@/modules/vehicles/actions/create-vehicle";
import type { CustomerOption, VehicleOption } from "../types";
import { FuelType } from "@prisma/client";

interface QuickCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: CustomerOption, vehicle: VehicleOption | null) => void;
}

type Step = "customer" | "vehicle";

export function QuickCreateDialog({ open, onClose, onCreated }: QuickCreateDialogProps) {
  const t = useTranslations("offers.quickCreate");
  const tv = useTranslations("vehicles.fuelTypes");

  const [step, setStep] = useState<Step>("customer");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [createdCustomer, setCreatedCustomer] = useState<CustomerOption | null>(null);
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [registrationPlate, setRegistrationPlate] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>(FuelType.PETROL);

  function reset() {
    setStep("customer");
    setError(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setCompanyName("");
    setCreatedCustomer(null);
    setCreatedCustomerId(null);
    setMake("");
    setModel("");
    setYear(String(new Date().getFullYear()));
    setRegistrationPlate("");
    setFuelType(FuelType.PETROL);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleCustomerSubmit() {
    if (!firstName.trim() || !lastName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createCustomer({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        companyName: companyName.trim() || undefined,
        country: "SI",
        isActive: true,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const c = result.data!;
      const opt: CustomerOption = {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        companyName: c.companyName,
      };
      setCreatedCustomer(opt);
      setCreatedCustomerId(c.id);
      setStep("vehicle");
    });
  }

  function handleSkipVehicle() {
    if (!createdCustomer) return;
    onCreated(createdCustomer, null);
    reset();
    onClose();
  }

  function handleVehicleSubmit() {
    if (!createdCustomer || !createdCustomerId || !make.trim() || !model.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createVehicle(createdCustomerId, {
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year, 10),
        registrationPlate: registrationPlate.trim() || undefined,
        fuelType,
        isActive: true,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const v = result.data!;
      const vehicleOpt: VehicleOption = {
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        registrationPlate: v.registrationPlate,
      };
      onCreated(createdCustomer, vehicleOpt);
      reset();
      onClose();
    });
  }

  const fuelTypeLabels: Record<FuelType, string> = {
    [FuelType.PETROL]: tv("petrol"),
    [FuelType.DIESEL]: tv("diesel"),
    [FuelType.HYBRID]: tv("hybrid"),
    [FuelType.ELECTRIC]: tv("electric"),
    [FuelType.LPG]: tv("lpg"),
    [FuelType.OTHER]: tv("other"),
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "customer" ? (
              <><UserPlus className="h-4 w-4" /> {t("newCustomer")}</>
            ) : (
              <><Car className="h-4 w-4" /> {t("addVehicle")}</>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "customer"
              ? t("customerDesc")
              : t("vehicleDesc", { name: `${createdCustomer?.firstName} ${createdCustomer?.lastName}` })}
          </DialogDescription>
        </DialogHeader>

        {step === "customer" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qc-firstName">
                  {t("firstName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="qc-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomerSubmit()}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-lastName">
                  {t("lastName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="qc-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomerSubmit()}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-company">{t("company")}</Label>
              <Input
                id="qc-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qc-phone">{t("phone")}</Label>
                <Input
                  id="qc-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-email">{t("email")}</Label>
                <Input
                  id="qc-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleCustomerSubmit}
                disabled={!firstName.trim() || !lastName.trim() || isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="mr-1 h-4 w-4" />
                )}
                {t("nextAddVehicle")}
              </Button>
            </div>
          </div>
        )}

        {step === "vehicle" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qc-make">
                  {t("make")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="qc-make"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-model">
                  {t("model")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="qc-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qc-year">
                  {t("year")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="qc-year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-plate">{t("registrationPlate")}</Label>
                <Input
                  id="qc-plate"
                  value={registrationPlate}
                  onChange={(e) => setRegistrationPlate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-fuel">{t("fuelType")}</Label>
              <select
                id="qc-fuel"
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as FuelType)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {Object.values(FuelType).map((f) => (
                  <option key={f} value={f}>
                    {fuelTypeLabels[f]}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSkipVehicle}
                disabled={isPending}
              >
                {t("skipVehicle")}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep("customer"); setError(null); }}
                  disabled={isPending}
                >
                  {t("back")}
                </Button>
                <Button
                  type="button"
                  onClick={handleVehicleSubmit}
                  disabled={!make.trim() || !model.trim() || !year || isPending}
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("createAndSelect")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
