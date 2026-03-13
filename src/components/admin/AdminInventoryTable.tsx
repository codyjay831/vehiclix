"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, Search, Plus, ExternalLink, Copy, Check, Share2, Facebook, Eye, Edit, EyeOff, Archive, CheckCircle2, FileText, Mail, BarChart3 } from "lucide-react";
import {
  VehicleWithMedia,
  VehicleStatus,
  VEHICLE_STATUS_LABELS,
} from "@/types";
import { ListingGeneratorModal, GeneratorType } from "./ListingGeneratorModal";
import { trackVehicleShareAction, updateVehicleStatusAction } from "@/actions/inventory";
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
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [activeVehicle, setActiveVehicle] = React.useState<VehicleWithMedia | null>(null);
  const [generatorType, setGeneratorType] = React.useState<GeneratorType>("FACEBOOK");

  const openGenerator = (vehicle: VehicleWithMedia, type: GeneratorType) => {
    setActiveVehicle(vehicle);
    setGeneratorType(type);
  };

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

  const copyListingLink = async (vehicleId: string, orgSlug: string) => {
    const url = `${window.location.origin}/inventory/${vehicleId}?org=${orgSlug}`;
    await navigator.clipboard.writeText(url);
    await trackVehicleShareAction(vehicleId);
    setCopiedId(vehicleId);
    toast.success("Link copied");
    setTimeout(() => setCopiedId(null), 2000);
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
              <TableHead>Actions</TableHead>
              <TableHead className="text-right">Stats</TableHead>
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
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-2 text-xs font-bold">
                            <Share2 className="mr-1 h-3.5 w-3.5" />
                            Share
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => copyListingLink(vehicle.id, vehicle.organization.slug)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/inventory/${vehicle.id}?org=${vehicle.organization.slug}`}
                              target="_blank"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Listing
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openGenerator(vehicle, "FACEBOOK")}>
                            <Facebook className="mr-2 h-4 w-4 text-[#1877F2]" />
                            Generate Facebook Post
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openGenerator(vehicle, "CRAIGSLIST")}>
                            <FileText className="mr-2 h-4 w-4 text-purple-600" />
                            Generate Craigslist Listing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openGenerator(vehicle, "EMAIL")}>
                            <Mail className="mr-2 h-4 w-4 text-red-500" />
                            Generate Email Listing
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end text-xs text-muted-foreground">
                      <div className="flex items-center gap-1" title="Views">
                        <BarChart3 className="h-3 w-3" /> {vehicle.views || 0}
                      </div>
                      <div className="flex items-center gap-1" title="Shares">
                        <Share2 className="h-3 w-3" /> {vehicle.shares || 0}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem asChild className="font-bold">
                          <Link href={`/admin/inventory/${vehicle.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild disabled={LOCKED_STATUSES.includes(vehicle.vehicleStatus)}>
                          <Link href={`/admin/inventory/${vehicle.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Details
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        
                        {/* Status Quick Actions */}
                        {vehicle.vehicleStatus === "LISTED" && (
                          <>
                            <DropdownMenuItem onClick={() => handleStatusChange(vehicle.id, "SOLD")}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                              Mark as Sold
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(vehicle.id, "ARCHIVED")}>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Hide Listing
                            </DropdownMenuItem>
                          </>
                        )}

                        {vehicle.vehicleStatus === "ARCHIVED" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(vehicle.id, "LISTED")}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Re-Publish
                          </DropdownMenuItem>
                        )}

                        {vehicle.vehicleStatus === "DRAFT" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(vehicle.id, "LISTED")}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Publish to Showroom
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        
                        {LOCKED_STATUSES.includes(vehicle.vehicleStatus) && vehicle.vehicleStatus !== "SOLD" && (
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
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  {isPending ? "Updating..." : "No vehicles found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ListingGeneratorModal
        vehicle={activeVehicle}
        type={generatorType}
        isOpen={!!activeVehicle}
        onClose={() => setActiveVehicle(null)}
      />
    </div>
  );
}
