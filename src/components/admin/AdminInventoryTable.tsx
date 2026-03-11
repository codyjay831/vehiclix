"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, Search, Plus } from "lucide-react";
import {
  VehicleWithMedia,
  VehicleStatus,
  VEHICLE_STATUS_LABELS,
} from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { updateVehicleStatusAction } from "@/actions/inventory";
import { toast } from "sonner";

// Helper to get status badge styling
const getStatusBadgeVariant = (status: VehicleStatus) => {
  switch (status) {
    case "LISTED":
      return "default";
    case "RESERVED":
    case "UNDER_CONTRACT":
      return "secondary";
    case "DRAFT":
      return "outline";
    case "SOLD":
      return "outline";
    case "ARCHIVED":
      return "destructive";
    default:
      return "outline";
  }
};

interface AdminInventoryTableProps {
  initialVehicles: VehicleWithMedia[];
}

type FilterGroup = "ALL" | "ACTIVE" | "DRAFT" | "SOLD" | "ARCHIVED";

const ACTIVE_STATUSES: VehicleStatus[] = ["LISTED", "RESERVED", "UNDER_CONTRACT"];
const LOCKED_STATUSES: VehicleStatus[] = ["RESERVED", "UNDER_CONTRACT", "SOLD"];

export function AdminInventoryTable({ initialVehicles }: AdminInventoryTableProps) {
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<FilterGroup>("ACTIVE");
  const [isPending, startTransition] = React.useTransition();

  const handleStatusChange = (vehicleId: string, newStatus: VehicleStatus) => {
    startTransition(async () => {
      try {
        await updateVehicleStatusAction(vehicleId, newStatus);
        toast.success(`Vehicle status updated to ${VEHICLE_STATUS_LABELS[newStatus]}`);
      } catch (error: any) {
        toast.error(error.message || "Failed to update status");
      }
    });
  };

  const filteredVehicles = React.useMemo(() => {
    return initialVehicles.filter((vehicle) => {
      // 1. Search filter (Make, Model, VIN)
      const searchStr = `${vehicle.make} ${vehicle.model} ${vehicle.vin}`.toLowerCase();
      const matchesSearch = searchStr.includes(search.toLowerCase());

      // 2. Tab filter
      let matchesTab = true;
      if (activeTab === "ACTIVE") {
        matchesTab = ACTIVE_STATUSES.includes(vehicle.vehicleStatus);
      } else if (activeTab === "DRAFT") {
        matchesTab = vehicle.vehicleStatus === "DRAFT";
      } else if (activeTab === "SOLD") {
        matchesTab = vehicle.vehicleStatus === "SOLD";
      } else if (activeTab === "ARCHIVED") {
        matchesTab = vehicle.vehicleStatus === "ARCHIVED";
      }

      return matchesSearch && matchesTab;
    });
  }, [initialVehicles, search, activeTab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Tabs
          defaultValue="ACTIVE"
          onValueChange={(v) => setActiveTab(v as FilterGroup)}
          className="w-full sm:w-auto"
        >
          <TabsList>
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="DRAFT">Draft</TabsTrigger>
            <TabsTrigger value="SOLD">Sold</TabsTrigger>
            <TabsTrigger value="ARCHIVED">Archived</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search VIN, Make, Model..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Photo</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead className="hidden md:table-cell">VIN</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="hidden lg:table-cell">Mileage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden xl:table-cell text-right">Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    {vehicle.media[0] ? (
                      <img
                        src={vehicle.media[0].url}
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        className="h-10 w-10 rounded object-cover border bg-muted"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                        No image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </span>
                      <span className="text-xs text-muted-foreground md:hidden">
                        {vehicle.vin}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs">
                    {vehicle.vin}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(Number(vehicle.price))}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {vehicle.mileage.toLocaleString()} mi
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(vehicle.vehicleStatus)}>
                      {VEHICLE_STATUS_LABELS[vehicle.vehicleStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-right text-muted-foreground text-xs">
                    {new Date(vehicle.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href={`/admin/inventory/${vehicle.id}/edit`}>
                          <DropdownMenuItem disabled={LOCKED_STATUSES.includes(vehicle.vehicleStatus)}>
                            Edit Vehicle
                          </DropdownMenuItem>
                        </Link>
                        
                        {vehicle.vehicleStatus === "DRAFT" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(vehicle.id, "LISTED")}>
                            Publish to Showroom
                          </DropdownMenuItem>
                        )}

                        {vehicle.vehicleStatus === "LISTED" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(vehicle.id, "ARCHIVED")}>
                            Archive Vehicle
                          </DropdownMenuItem>
                        )}

                        {vehicle.vehicleStatus === "ARCHIVED" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(vehicle.id, "LISTED")}>
                            Restore to Listed
                          </DropdownMenuItem>
                        )}

                        {LOCKED_STATUSES.includes(vehicle.vehicleStatus) && (
                          <DropdownMenuItem disabled className="text-muted-foreground italic">
                            Status Locked by Deal
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {isPending ? "Updating..." : "No vehicles found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
