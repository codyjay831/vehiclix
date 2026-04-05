"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SerializedVehicleWithMedia } from "@/lib/vehicle-serialization";
import { deleteVehicleAction } from "@/actions/inventory";
import { toast } from "sonner";
import { AlertTriangle, Trash2, Archive, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_STATUS_LABELS } from "@/types";
import { useRouter } from "next/navigation";

interface DeleteVehicleDialogProps {
  vehicle: SerializedVehicleWithMedia | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (vehicleId: string, mode: "ARCHIVE" | "PERMANENT") => void;
  confirmText: string;
  setConfirmText: (text: string) => void;
}

export function DeleteVehicleDialog({
  vehicle,
  isOpen,
  onClose,
  onSuccess,
  confirmText,
  setConfirmText,
}: DeleteVehicleDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);

  if (!vehicle) return null;

  const hasDependencies =
    (vehicle._count?.deals || 0) > 0 ||
    (vehicle._count?.leads || 0) > 0 ||
    (vehicle._count?.tradeInCaptures || 0) > 0 ||
    (vehicle._count?.inquiries || 0) > 0;

  const isPermanentDisabled = hasDependencies || confirmText !== "DELETE";

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = await deleteVehicleAction(vehicle.id, "ARCHIVE");
      if (result.ok) {
        toast.success("Vehicle archived");
        onSuccess?.(vehicle.id, "ARCHIVE");
        onClose();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error("Failed to archive vehicle");
    } finally {
      setIsArchiving(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (isPermanentDisabled) return;
    setIsDeleting(true);
    try {
      const result = await deleteVehicleAction(vehicle.id, "PERMANENT");
      if (result.ok) {
        toast.success("Vehicle permanently deleted");
        onSuccess?.(vehicle.id, "PERMANENT");
        onClose();
        // If we're on the detail page, we should redirect to inventory
        if (window.location.pathname.includes(vehicle.id)) {
          router.push("/admin/inventory");
        }
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error("Failed to delete vehicle");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Vehicle
          </DialogTitle>
          <DialogDescription className="pt-2">
            Choose how you want to remove this vehicle from your inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Vehicle Identity */}
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black uppercase tracking-tight text-lg leading-tight">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-xs font-mono text-muted-foreground uppercase">
                  VIN: {vehicle.vin}
                </p>
              </div>
              <Badge variant="outline">
                {VEHICLE_STATUS_LABELS[vehicle.vehicleStatus]}
              </Badge>
            </div>
          </div>

          {/* Archive Option */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
                <Archive className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Safe Remove: Archive</h4>
                <p className="text-xs text-muted-foreground">
                  Hides the vehicle from your public site but keeps it in your records.
                  This is the recommended path for production data.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full font-bold border-2"
              onClick={handleArchive}
              disabled={isArchiving || isDeleting || vehicle.vehicleStatus === "ARCHIVED"}
            >
              {isArchiving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Archive className="mr-2 h-4 w-4" />
              )}
              {vehicle.vehicleStatus === "ARCHIVED" ? "Already Archived" : "Archive Vehicle"}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-bold tracking-widest">OR</span>
            </div>
          </div>

          {/* Permanent Delete Option */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-destructive/10 text-destructive mt-0.5">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Destructive: Delete Permanently</h4>
                <p className="text-xs text-muted-foreground">
                  Completely removes the vehicle and all associated media from your database and storage.
                </p>
              </div>
            </div>

            {hasDependencies ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-destructive">
                      Cannot Delete Permanently
                    </h5>
                    <p className="text-xs text-destructive/80 leading-relaxed">
                      This vehicle has associated records (leads, deals, or inquiries) and must be archived instead of deleted.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Type <span className="text-destructive">DELETE</span> to confirm permanent removal
                </p>
                <Input
                  placeholder="DELETE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="border-2 uppercase font-mono"
                  disabled={isArchiving || isDeleting}
                />
                <Button
                  variant="destructive"
                  className="w-full font-black uppercase tracking-tighter h-11"
                  disabled={isPermanentDisabled || isDeleting || isArchiving}
                  onClick={handlePermanentDelete}
                >
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Permanently Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting || isArchiving}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
