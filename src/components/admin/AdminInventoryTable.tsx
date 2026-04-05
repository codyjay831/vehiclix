"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, Search, Plus, ExternalLink, Copy, Check, Share2, Facebook, Eye, Edit, EyeOff, Archive, CheckCircle2, FileText, Mail, BarChart3, ArrowRight, Type, Trash2, RotateCw } from "lucide-react";
import {
  VehicleStatus,
  VEHICLE_STATUS_LABELS,
} from "@/types";
import { SerializedVehicleWithMedia } from "@/lib/vehicle-serialization";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ListingGeneratorModal, GeneratorType } from "./ListingGeneratorModal";
import { DeleteVehicleDialog } from "./DeleteVehicleDialog";
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
import { vehicleMediaAdminThumbUrl } from "@/lib/vehicle-media-display";
import { computeVehicleReadiness } from "@/lib/vehicle-readiness";
import { formatUTC } from "@/lib/date-utils";
import { AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper to get status badge styling
const getStatusBadgeVariant = (status: VehicleStatus) => {
  switch (status) {
    case "LISTED":
      return "default";
    case "UNPUBLISHED":
      return "outline";
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
  initialVehicles: SerializedVehicleWithMedia[];
}

type FilterGroup = "ALL" | "PUBLISHED" | "STAGING" | "DRAFT" | "DEALS" | "SOLD" | "ARCHIVED";

const LOCKED_STATUSES: VehicleStatus[] = ["RESERVED", "UNDER_CONTRACT", "SOLD"];

export function AdminInventoryTable({ initialVehicles }: AdminInventoryTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // URL State Management
  const currentTab = (searchParams.get("tab") as FilterGroup) || "PUBLISHED";
  const currentSearch = searchParams.get("search") || "";

  const [vehicles, setVehicles] = React.useState(initialVehicles);
  const [search, setSearch] = React.useState(currentSearch);
  const [activeTab, setActiveTab] = React.useState<FilterGroup>(currentTab);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [activeVehicle, setActiveVehicle] = React.useState<SerializedVehicleWithMedia | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [generatorType, setGeneratorType] = React.useState<GeneratorType>("FACEBOOK");

  // Sync state with URL when it changes (e.g. back button)
  React.useEffect(() => {
    setActiveTab(currentTab);
    setSearch(currentSearch);
  }, [currentTab, currentSearch]);

  // Sync vehicles when initialVehicles changes (server-side refresh)
  React.useEffect(() => {
    setVehicles(initialVehicles);
  }, [initialVehicles]);

  const updateUrl = (tab: FilterGroup, searchText: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab && tab !== "PUBLISHED") {
      params.set("tab", tab);
    } else {
      params.delete("tab");
    }
    
    if (searchText) {
      params.set("search", searchText);
    } else {
      params.delete("search");
    }
    
    // Use replace for filter changes to avoid polluting history
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Debounced search sync to URL
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== currentSearch) {
        updateUrl(activeTab, search);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, activeTab]);

  const handleTabChange = (tab: FilterGroup) => {
    setActiveTab(tab);
    updateUrl(tab, search);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    // URL update happens in the useEffect above
  };

  const openGenerator = (vehicle: SerializedVehicleWithMedia, type: GeneratorType) => {
    setActiveVehicle(vehicle);
    setGeneratorType(type);
  };

  const openDeleteDialog = (vehicle: SerializedVehicleWithMedia) => {
    setActiveVehicle(vehicle);
    setIsDeleteDialogOpen(true);
  };

  const handleStatusChange = (vehicleId: string, newStatus: VehicleStatus) => {
    // Optimistic Update
    setVehicles(prev => prev.map(v => 
      v.id === vehicleId ? { ...v, vehicleStatus: newStatus } : v
    ));

    startTransition(async () => {
      try {
        await updateVehicleStatusAction(vehicleId, newStatus);
        toast.success(`Vehicle status updated to ${VEHICLE_STATUS_LABELS[newStatus]}`);
        router.refresh(); // Sync server truth
      } catch (error: any) {
        // Rollback on error
        setVehicles(initialVehicles);
        toast.error(error.message || "Failed to update status");
      }
    });
  };

  const copyListingLink = async (vehicleId: string, orgSlug: string, orgId: string) => {
    const url = `${window.location.origin}/${orgSlug}/inventory/${vehicleId}`;
    await navigator.clipboard.writeText(url);
    await trackVehicleShareAction(vehicleId, orgId);
    setCopiedId(vehicleId);
    toast.success("Link copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredVehicles = React.useMemo(() => {
    return vehicles.filter((vehicle) => {
      // 1. Search filter (Make, Model, VIN)
      const searchStr = `${vehicle.make} ${vehicle.model} ${vehicle.vin}`.toLowerCase();
      const matchesSearch = searchStr.includes(search.toLowerCase());

      // 2. Tab filter
      let matchesTab = true;
      if (activeTab === "PUBLISHED") {
        matchesTab = vehicle.vehicleStatus === "LISTED";
      } else if (activeTab === "STAGING") {
        matchesTab = vehicle.vehicleStatus === "UNPUBLISHED";
      } else if (activeTab === "DRAFT") {
        matchesTab = vehicle.vehicleStatus === "DRAFT";
      } else if (activeTab === "DEALS") {
        matchesTab = vehicle.vehicleStatus === "RESERVED" || vehicle.vehicleStatus === "UNDER_CONTRACT";
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
          value={activeTab}
          onValueChange={(v) => handleTabChange(v as FilterGroup)}
          className="w-full sm:w-auto"
        >
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="PUBLISHED" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Published</TabsTrigger>
            <TabsTrigger value="STAGING" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Unpublished</TabsTrigger>
            <TabsTrigger value="DRAFT" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Draft</TabsTrigger>
            <TabsTrigger value="DEALS" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">In Deals</TabsTrigger>
            <TabsTrigger value="SOLD" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Sold</TabsTrigger>
            <TabsTrigger value="ARCHIVED" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Archived</TabsTrigger>
            <TabsTrigger value="ALL" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search VIN, Make, Model..."
              className="pl-8"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              startTransition(() => {
                router.refresh();
              });
              toast.info("Refreshing inventory...");
            }}
            disabled={isPending}
            title="Refresh data"
          >
            <RotateCw className={cn("h-4 w-4", isPending && "animate-spin")} />
          </Button>
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
              <TableHead className="hidden md:table-cell">Readiness</TableHead>
              <TableHead>Next Action</TableHead>
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
                        src={vehicleMediaAdminThumbUrl(vehicle.media[0])}
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
                  <TableCell className="hidden md:table-cell">
                    <ReadinessIndicator vehicle={vehicle} />
                  </TableCell>
                  <TableCell>
                    <NextActionCell vehicle={vehicle} onStatusChange={handleStatusChange} />
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-right text-muted-foreground text-xs">
                    {formatUTC(vehicle.createdAt)}
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
                          <DropdownMenuItem 
                            disabled={vehicle.vehicleStatus !== "LISTED"}
                            onClick={() => copyListingLink(vehicle.id, vehicle.organization.slug, vehicle.organization.id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild disabled={vehicle.vehicleStatus !== "LISTED"}>
                            {vehicle.vehicleStatus === "LISTED" ? (
                              <Link
                                href={`/${vehicle.organization.slug}/inventory/${vehicle.id}`}
                                target="_blank"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Listing
                              </Link>
                            ) : (
                              <span className="flex items-center opacity-50 cursor-not-allowed px-2 py-1.5 text-sm">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Listing
                              </span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openGenerator(vehicle, "FACEBOOK")}>
                            <Facebook className="mr-2 h-4 w-4 text-[#1877F2]" />
                            Facebook Template
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openGenerator(vehicle, "CRAIGSLIST")}>
                            <FileText className="mr-2 h-4 w-4 text-purple-600" />
                            Craigslist Template
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openGenerator(vehicle, "GENERIC")}>
                            <Type className="mr-2 h-4 w-4 text-gray-600" />
                            Generic Template
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openGenerator(vehicle, "EMAIL")}>
                            <Mail className="mr-2 h-4 w-4 text-red-500" />
                            Email Template
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
                              Unpublish & Archive
                            </DropdownMenuItem>
                          </>
                        )}

                        {vehicle.vehicleStatus === "ARCHIVED" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(vehicle.id, "UNPUBLISHED")}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Restore to Unpublished
                          </DropdownMenuItem>
                        )}

                        {vehicle.vehicleStatus === "DRAFT" && (
                          <DropdownMenuItem 
                            disabled={!computeVehicleReadiness(vehicle).isReadyForUnpublished}
                            onClick={() => handleStatusChange(vehicle.id, "UNPUBLISHED")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Move to Unpublished
                          </DropdownMenuItem>
                        )}

                        {vehicle.vehicleStatus === "UNPUBLISHED" && (
                          <>
                            <DropdownMenuItem 
                              disabled={!computeVehicleReadiness(vehicle).isReadyForPublished}
                              onClick={() => handleStatusChange(vehicle.id, "LISTED")}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Publish to showroom
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(vehicle.id, "DRAFT")}>
                              <Edit className="mr-2 h-4 w-4" />
                              Demote to Draft
                            </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuSeparator />
                        
                        {LOCKED_STATUSES.includes(vehicle.vehicleStatus) && vehicle.vehicleStatus !== "SOLD" && (
                          <DropdownMenuItem disabled className="text-muted-foreground italic">
                            Status Locked by Deal
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive font-bold hover:bg-destructive/10"
                          onClick={() => openDeleteDialog(vehicle)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Vehicle
                        </DropdownMenuItem>
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
        isOpen={!!activeVehicle && !isDeleteDialogOpen}
        onClose={() => setActiveVehicle(null)}
      />

      <DeleteVehicleDialog
        vehicle={activeVehicle}
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setActiveVehicle(null);
        }}
        confirmText={deleteConfirmText}
        setConfirmText={setDeleteConfirmText}
        onSuccess={(id, mode) => {
          if (mode === "PERMANENT") {
            setVehicles((prev) => prev.filter((v) => v.id !== id));
          } else {
            setVehicles((prev) =>
              prev.map((v) => (v.id === id ? { ...v, vehicleStatus: "ARCHIVED" } : v))
            );
          }
          router.refresh();
        }}
      />
    </div>
  );
}

function NextActionCell({ 
  vehicle, 
  onStatusChange 
}: { 
  vehicle: SerializedVehicleWithMedia; 
  onStatusChange: (id: string, status: VehicleStatus) => void 
}) {
  const readiness = computeVehicleReadiness(vehicle);
  
  if (vehicle.vehicleStatus === "DRAFT") {
    if (readiness.isReadyForUnpublished) {
      return (
        <Button 
          size="sm" 
          variant="outline" 
          className="h-7 text-[10px] font-bold uppercase tracking-wider border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700"
          onClick={() => onStatusChange(vehicle.id, "UNPUBLISHED")}
        >
          Move to Unpublished
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      );
    }
    return (
      <Button asChild size="sm" variant="ghost" className="h-7 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Link href={`/admin/inventory/${vehicle.id}/edit`}>
          Complete Details
        </Link>
      </Button>
    );
  }

  if (vehicle.vehicleStatus === "UNPUBLISHED") {
    if (readiness.isReadyForPublished) {
      return (
        <Button 
          size="sm" 
          className="h-7 text-[10px] font-bold uppercase tracking-wider"
          onClick={() => onStatusChange(vehicle.id, "LISTED")}
        >
          Publish to Showroom
          <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      );
    }
    return (
      <Button asChild size="sm" variant="ghost" className="h-7 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Link href={`/admin/inventory/${vehicle.id}/edit`}>
          Fix Issues to Publish
        </Link>
      </Button>
    );
  }

  if (vehicle.vehicleStatus === "LISTED") {
    return (
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Live on Site
      </div>
    );
  }

  return <span className="text-[10px] text-muted-foreground italic">—</span>;
}

function ReadinessIndicator({ vehicle }: { vehicle: SerializedVehicleWithMedia }) {
  const readiness = computeVehicleReadiness(vehicle);
  
  const allBlocking = [...readiness.blockingUnpublished, ...readiness.blockingPublished];
  const hasBlocking = allBlocking.length > 0;
  const hasWarnings = readiness.warnings.length > 0;

  if (!hasBlocking && !hasWarnings) {
    return (
      <div className="flex items-center gap-1 text-green-600" title="Ready for Showroom">
        <CheckCircle className="h-4 w-4" />
        <span className="text-xs font-medium">Ready</span>
      </div>
    );
  }

  const tooltipText = [
    readiness.blockingUnpublished.length > 0 ? `Required for Unpublished: ${readiness.blockingUnpublished.map(i => i.message).join(", ")}` : "",
    readiness.blockingPublished.length > 0 ? `Required for Showroom: ${readiness.blockingPublished.map(i => i.message).join(", ")}` : "",
    readiness.warnings.length > 0 ? `Recommended: ${readiness.warnings.map(i => i.message).join(", ")}` : ""
  ].filter(Boolean).join("\n");

  return (
    <div 
      className={cn(
        "flex items-center gap-1 cursor-help",
        hasBlocking ? "text-amber-600" : "text-blue-600"
      )}
      title={tooltipText}
    >
      <AlertCircle className={cn("h-4 w-4", !hasBlocking && "text-blue-500")} />
      <span className="text-xs font-medium">
        {hasBlocking 
          ? `${allBlocking.length} issue${allBlocking.length === 1 ? "" : "s"}`
          : `${readiness.warnings.length} warning${readiness.warnings.length === 1 ? "" : "s"}`
        }
      </span>
    </div>
  );
}
