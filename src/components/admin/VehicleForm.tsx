"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Drivetrain,
  InventoryCondition,
  TitleStatus,
  VehicleStatus,
} from "@prisma/client";
import {
  DRIVETRAIN_LABELS,
  INVENTORY_CONDITION_LABELS,
  TITLE_STATUS_LABELS,
} from "@/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createVehicleAction, isVinUnique, updateVehicleAction } from "@/actions/inventory";
import { cn } from "@/lib/utils";
import { Loader2, Plus, X, Upload, Save, Search, CheckCircle2, Star, Circle } from "lucide-react";
import { decodeVin } from "@/lib/vin";

const REQUIRED_FIELD_NAMES = new Set([
  "vin", "year", "make", "model", "mileage", "drivetrain",
  "exteriorColor", "interiorColor", "condition", "titleStatus", "price",
]);
function requiredFieldErrorClass(fieldName: string, invalid: boolean): string {
  return invalid && REQUIRED_FIELD_NAMES.has(fieldName) ? "border-destructive ring-2 ring-destructive/20" : "";
}

const vehicleSchema = z.object({
  vin: z.string().length(17, "VIN must be exactly 17 characters"),
  year: z.coerce.number().min(2010).max(new Date().getFullYear() + 1),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  trim: z.string().optional().nullable(),
  bodyStyle: z.string().optional().nullable(),
  fuelType: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  doors: z.coerce.number().min(2).max(5).optional().nullable(),
  mileage: z.coerce.number().min(0, "Mileage cannot be negative"),
  drivetrain: z.nativeEnum(Drivetrain),
  batteryRange: z.coerce.number().optional().nullable(),
  batteryCapacityKWh: z.coerce.number().min(0).max(500).optional().nullable(),
  batteryChemistry: z.string().optional().nullable(),
  chargingStandard: z.string().optional().nullable(),
  exteriorColor: z.string().min(1, "Exterior color is required"),
  interiorColor: z.string().min(1, "Interior color is required"),
  condition: z.nativeEnum(InventoryCondition),
  titleStatus: z.nativeEnum(TitleStatus),
  conditionNotes: z.string().max(2000).optional().nullable(),
  price: z.coerce.number().min(1000, "Price must be at least $1,000"),
  description: z.string().max(5000).optional().nullable(),
  highlights: z.array(z.string().max(80)).max(20).optional(),
  features: z.array(z.string()).optional(),
  internalNotes: z.string().max(5000).optional().nullable(),
  photos: z.any().optional(), // Handled manually with file input
});

interface VehicleFormProps {
  initialData?: any; // The full vehicle object if editing
  isEdit?: boolean;
}

interface VehicleFormValues {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  bodyStyle?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  doors?: number | null;
  mileage: number;
  drivetrain: Drivetrain;
  batteryRange?: number | null;
  batteryCapacityKWh?: number | null;
  batteryChemistry?: string | null;
  chargingStandard?: string | null;
  exteriorColor: string;
  interiorColor: string;
  condition: InventoryCondition;
  titleStatus: TitleStatus;
  conditionNotes?: string | null;
  price: number;
  description?: string | null;
  highlights?: string[];
  features?: string[];
  internalNotes?: string | null;
  photos?: any;
}

export function VehicleForm({ initialData, isEdit = false }: VehicleFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDecoding, setIsDecoding] = React.useState(false);
  const [photos, setPhotos] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: initialData ? {
      ...initialData,
      price: Number(initialData.price),
      batteryRange: initialData.batteryRangeEstimate,
      bodyStyle: initialData.bodyStyle ?? null,
      fuelType: initialData.fuelType ?? null,
      transmission: initialData.transmission ?? null,
      doors: initialData.doors ?? null,
      batteryCapacityKWh: initialData.batteryCapacityKWh ?? null,
      batteryChemistry: initialData.batteryChemistry ?? null,
      chargingStandard: initialData.chargingStandard ?? null,
    } : {
      highlights: [],
      features: [],
    },
  });

  const { fields: highlightFields, append: appendHighlight, remove: removeHighlight } = useFieldArray({
    control: form.control,
    name: "highlights" as any,
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control: form.control,
    name: "features" as any,
  });

  const watched = form.watch([
    "vin", "year", "make", "model", "mileage", "drivetrain",
    "exteriorColor", "interiorColor", "condition", "titleStatus", "price",
    "description", "highlights",
  ]);
  const yearNum = Number(watched[1]);
  const yearPlausible = !Number.isNaN(yearNum) && yearNum >= 1900 && yearNum <= new Date().getFullYear() + 1;
  const section1Complete = Boolean(
    watched[0]?.length === 17 &&
    yearPlausible &&
    String(watched[2] ?? "").trim() &&
    String(watched[3] ?? "").trim()
  );
  const section2Complete = Boolean(Number(watched[4]) >= 0 && watched[5]);
  const section3Complete = Boolean(
    String(watched[6] ?? "").trim() &&
    String(watched[7] ?? "").trim() &&
    watched[8] &&
    watched[9]
  );
  const section4Complete = Boolean(Number(watched[10]) >= 1000);
  const section5Complete = Boolean(
    String(watched[11] ?? "").trim() ||
    (Array.isArray(watched[12]) && watched[12].some((h: string) => String(h ?? "").trim()))
  );
  const section6Complete = isEdit || photos.length >= 1;

  const handleDecodeVin = async () => {
    const vin = form.getValues("vin");
    if (!vin || vin.length !== 17) {
      toast.error("Please enter a valid 17-character VIN first");
      return;
    }

    setIsDecoding(true);
    try {
      const data = await decodeVin(vin);
      if (data) {
        const isStringEmpty = (v: unknown) => v == null || v === undefined || !String(v ?? "").trim();
        const isNumberEmpty = (v: unknown) =>
          v == null || v === undefined || v === "" || (typeof v === "number" && (Number.isNaN(v) || v === 0));

        if (data.year != null && isNumberEmpty(form.getValues("year"))) form.setValue("year", data.year);
        if (data.make && isStringEmpty(form.getValues("make"))) form.setValue("make", data.make);
        if (data.model && isStringEmpty(form.getValues("model"))) form.setValue("model", data.model);
        if (data.trim != null && isStringEmpty(form.getValues("trim"))) form.setValue("trim", data.trim);
        if (data.drivetrain && isStringEmpty(form.getValues("drivetrain"))) form.setValue("drivetrain", data.drivetrain);
        if (data.bodyStyle != null && isStringEmpty(form.getValues("bodyStyle"))) form.setValue("bodyStyle", data.bodyStyle);
        if (data.fuelType != null && isStringEmpty(form.getValues("fuelType"))) form.setValue("fuelType", data.fuelType);
        if (data.transmission != null && isStringEmpty(form.getValues("transmission"))) form.setValue("transmission", data.transmission);
        if (data.doors != null && isNumberEmpty(form.getValues("doors"))) form.setValue("doors", data.doors);
        if (data.batteryCapacityKWh != null && isNumberEmpty(form.getValues("batteryCapacityKWh"))) form.setValue("batteryCapacityKWh", data.batteryCapacityKWh);

        const currentHighlights = form.getValues("highlights") || [];
        const newHighlights = [...currentHighlights];
        if (data.engine && !newHighlights.includes(`Engine: ${data.engine}`)) {
          newHighlights.push(`Engine: ${data.engine}`);
        }
        if (data.horsepower && !newHighlights.includes(`${data.horsepower} HP`)) {
          newHighlights.push(`${data.horsepower} HP`);
        }
        form.setValue("highlights", newHighlights);
        toast.success("Vehicle data populated from VIN");
      } else {
        toast.error("Could not decode VIN. Please enter details manually.");
      }
    } catch (error) {
      toast.error("VIN API error. Please enter details manually.");
    } finally {
      setIsDecoding(false);
    }
  };

  const onSubmit = async (values: VehicleFormValues, status?: VehicleStatus) => {
    setIsSubmitting(true);
    try {
      // 1. Check VIN uniqueness
      const isUnique = await isVinUnique(values.vin, initialData?.id);
      if (!isUnique) {
        form.setError("vin", { message: "A vehicle with this VIN already exists" });
        setIsSubmitting(false);
        return;
      }

      if (!isEdit) {
        // 2. Additional Publish Validation (Only for Creation)
        if (status === "LISTED") {
          if (!values.description) {
            form.setError("description", { message: "Description is required to publish" });
            setIsSubmitting(false);
            return;
          }
          if (photos.length === 0) {
            toast.error("At least one photo is required to publish");
            setIsSubmitting(false);
            return;
          }
        }

        // 3. Submit Create
        const formData = new FormData();
        formData.append("status", status!);
        Object.entries(values).forEach(([key, value]) => {
          if (key === "highlights" || key === "features") {
            (value as string[]).forEach((v) => formData.append(key, v));
          } else if (value !== undefined && value !== null && key !== "photos") {
            formData.append(key, value.toString());
          }
        });
        photos.forEach((photo) => formData.append("photos", photo));

        await createVehicleAction(formData);
        toast.success(status === "LISTED" ? "Vehicle published successfully" : "Vehicle saved as draft");
      } else {
        // 3. Submit Update (Field only)
        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) => {
          if (key === "highlights" || key === "features") {
            (value as string[]).forEach((v) => formData.append(key, v));
          } else if (value !== undefined && value !== null && key !== "photos") {
            formData.append(key, value.toString());
          }
        });

        await updateVehicleAction(initialData.id, formData);
        toast.success("Vehicle updated successfully");
        router.push("/admin/inventory");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos([...photos, ...Array.from(e.target.files)]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const setPrimaryPhoto = (index: number) => {
    const newPhotos = [...photos];
    const [selected] = newPhotos.splice(index, 1);
    newPhotos.unshift(selected);
    setPhotos(newPhotos);
    toast.success("Primary photo updated");
  };

  return (
    <Form {...form}>
      <form className="space-y-8 pb-24">
        {/* Section 1: Identification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              1. Vehicle Identification
              {section1Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <FormField
                control={form.control}
                name="vin"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>VIN</FormLabel>
                    <FormControl>
                      <Input placeholder="17-character VIN" {...field} value={field.value || ""} maxLength={17} className={cn("uppercase font-mono", requiredFieldErrorClass("vin", fieldState.invalid))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="button" 
                variant="secondary" 
                className="h-10 px-6 font-bold shadow-sm border-2 border-primary/10 hover:border-primary/30"
                onClick={handleDecodeVin}
                disabled={isDecoding}
              >
                {isDecoding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Decode VIN
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField
                control={form.control}
                name="year"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value || ""} className={requiredFieldErrorClass("year", fieldState.invalid)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="make"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Tesla, Rivian" {...field} value={field.value || ""} className={requiredFieldErrorClass("make", fieldState.invalid)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Model 3, R1S" {...field} value={field.value || ""} className={requiredFieldErrorClass("model", fieldState.invalid)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trim"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>Trim (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Performance, Adventure" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Specifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              2. Specifications
              {section2Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="mileage"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Mileage</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value || ""} className={requiredFieldErrorClass("mileage", fieldState.invalid)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="drivetrain"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Drivetrain</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={requiredFieldErrorClass("drivetrain", fieldState.invalid)}>
                        <SelectValue placeholder="Select drivetrain" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DRIVETRAIN_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bodyStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Style (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sedan, SUV" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fuelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuel Type (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Gasoline, Electric" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transmission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transmission (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Automatic, CVT" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="doors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doors (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" min={2} max={5} placeholder="2–5" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="batteryRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Battery Range (mi)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(() => {
              const fuelType = form.watch("fuelType");
              const ft = (fuelType ?? "").trim().toLowerCase();
              const isElectric = ft.includes("electric") || ft.includes("battery") || ft === "ev" || ft.includes("bev") || ft.includes("phev");
              if (!isElectric) return null;
              return (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
                  <Separator className="my-6" />
                  <p className="text-sm font-medium text-muted-foreground">EV specifications (optional)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 min-w-0">
                    <FormField
                      control={form.control}
                      name="batteryCapacityKWh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Battery Capacity (kWh)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} max={500} step={0.1} placeholder="e.g. 75" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="batteryChemistry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Battery Chemistry</FormLabel>
                          <Select onValueChange={(v) => field.onChange(v === "" ? null : v)} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select or leave empty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">—</SelectItem>
                              <SelectItem value="LFP">LFP</SelectItem>
                              <SelectItem value="NMC">NMC</SelectItem>
                              <SelectItem value="NCA">NCA</SelectItem>
                              <SelectItem value="LMO">LMO</SelectItem>
                              <SelectItem value="LCO">LCO</SelectItem>
                              <SelectItem value="Unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="chargingStandard"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Charging Standard</FormLabel>
                          <Select onValueChange={(v) => field.onChange(v === "" ? null : v)} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select or leave empty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">—</SelectItem>
                              <SelectItem value="NACS">NACS</SelectItem>
                              <SelectItem value="CCS">CCS</SelectItem>
                              <SelectItem value="CHAdeMO">CHAdeMO</SelectItem>
                              <SelectItem value="J1772">J1772</SelectItem>
                              <SelectItem value="Unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              );
            })()}
              <FormField
                control={form.control}
                name="exteriorColor"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Exterior Color</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Midnight Silver" {...field} value={field.value || ""} className={requiredFieldErrorClass("exteriorColor", fieldState.invalid)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
              <FormField
                control={form.control}
                name="interiorColor"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Interior Color</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Black Vegan Leather" {...field} value={field.value || ""} className={requiredFieldErrorClass("interiorColor", fieldState.invalid)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 3: Condition & History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              3. Condition & History
              {section3Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="condition"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Inventory Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={requiredFieldErrorClass("condition", fieldState.invalid)}>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(INVENTORY_CONDITION_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="titleStatus"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Title Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={requiredFieldErrorClass("titleStatus", fieldState.invalid)}>
                          <SelectValue placeholder="Select title status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TITLE_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="conditionNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detail any scratches, interior wear, or unique history..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 4: Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              4. Pricing
              {section4Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="price"
              render={({ field, fieldState }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Listing Price (USD)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5">$</span>
                      <Input type="number" className={cn("pl-6", requiredFieldErrorClass("price", fieldState.invalid))} {...field} value={field.value || ""} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 5: Description & Highlights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              5. Description & Highlights
              {section5Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Required for Publish)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write a compelling description for the public listing..."
                      className="min-h-[200px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Vehicle Highlights (Optional)</FormLabel>
              <div className="flex flex-wrap gap-2">
                {highlightFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 bg-muted p-2 rounded-md">
                    <Input
                      {...form.register(`highlights.${index}` as any)}
                      className="h-8 w-48 border-none bg-transparent"
                      placeholder="e.g., New Tires"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeHighlight(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendHighlight("")}
                  disabled={highlightFields.length >= 20}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Highlight
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <FormLabel>Feature Checklist (Optional)</FormLabel>
              <div className="flex flex-wrap gap-2">
                {featureFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 bg-muted p-2 rounded-md">
                    <Input
                      {...form.register(`features.${index}` as any)}
                      className="h-8 w-48 border-none bg-transparent"
                      placeholder="e.g., Autopilot"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFeature(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendFeature("")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Feature
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Photos (Only for Creation in this pass) */}
        {!isEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                6. Photos
                {section6Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Click or drag photos to upload</p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Max 10MB each.</p>
                </div>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square rounded-md overflow-hidden border shadow-sm">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-1 right-1 flex gap-1">
                        {index !== 0 && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setPrimaryPhoto(index)}
                            title="Set as Primary"
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {index === 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-primary-foreground text-[10px] font-bold py-1 text-center flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Primary Image
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <FormDescription>At least 1 photo is required to publish.</FormDescription>
            </CardContent>
          </Card>
        )}

        {/* Section 7: Internal Notes */}
        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? "6. Internal Notes" : "7. Internal Notes"}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="internalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal-Only Notes (Private)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes for dealer use only. Acquisition cost, service status, etc..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>These notes are never visible to customers.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-background/80 backdrop-blur-sm border-t p-4 z-20 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <div className="flex gap-4">
              {!isEdit ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={form.handleSubmit((v) => onSubmit(v, "DRAFT"))}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={form.handleSubmit((v) => onSubmit(v, "LISTED"))}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Publish Vehicle
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={form.handleSubmit((v) => onSubmit(v))}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
