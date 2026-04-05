"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { DeleteVehicleDialog } from "./DeleteVehicleDialog";
import { SerializedVehicleWithMedia } from "@/lib/vehicle-serialization";

interface DeleteVehicleHeaderActionProps {
  vehicle: SerializedVehicleWithMedia;
}

export function DeleteVehicleHeaderAction({ vehicle }: DeleteVehicleHeaderActionProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-full font-bold flex-1 md:flex-none text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setIsOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>

      <DeleteVehicleDialog
        vehicle={vehicle}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        confirmText={deleteConfirmText}
        setConfirmText={setDeleteConfirmText}
      />
    </>
  );
}
