"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";

interface InventoryFiltersProps {
  makes: string[];
}

export function InventoryFilters({ makes }: InventoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [search, setSearch] = React.useState(searchParams.get("search") || "");

  const updateParams = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    setSearch("");
    router.push(pathname, { scroll: false });
  };

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-col gap-6 p-4 bg-muted/20 rounded-2xl border mb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Make Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Make
          </label>
          <Select
            value={searchParams.get("make") || "all"}
            onValueChange={(v) => updateParams({ make: v === "all" ? null : v })}
          >
            <SelectTrigger className="bg-background rounded-xl border-2">
              <SelectValue placeholder="All Makes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Makes</SelectItem>
              {makes.map((make) => (
                <SelectItem key={make} value={make}>
                  {make}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Max Price
          </label>
          <Select
            value={searchParams.get("maxPrice") || "any"}
            onValueChange={(v) => updateParams({ maxPrice: v === "any" ? null : v })}
          >
            <SelectTrigger className="bg-background rounded-xl border-2">
              <SelectValue placeholder="Any Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Price</SelectItem>
              <SelectItem value="40000">Under $40k</SelectItem>
              <SelectItem value="60000">Under $60k</SelectItem>
              <SelectItem value="80000">Under $80k</SelectItem>
              <SelectItem value="100000">Under $100k</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Year Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Min Year
          </label>
          <Select
            value={searchParams.get("minYear") || "any"}
            onValueChange={(v) => updateParams({ minYear: v === "any" ? null : v })}
          >
            <SelectTrigger className="bg-background rounded-xl border-2">
              <SelectValue placeholder="Any Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Year</SelectItem>
              <SelectItem value="2024">2024+</SelectItem>
              <SelectItem value="2022">2022+</SelectItem>
              <SelectItem value="2020">2020+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Sort By
          </label>
          <Select
            value={searchParams.get("sort") || "newest"}
            onValueChange={(v) => updateParams({ sort: v })}
          >
            <SelectTrigger className="bg-background rounded-xl border-2">
              <SelectValue placeholder="Newest First" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="mileage-asc">Lowest Mileage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Search
          </label>
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Model, VIN..."
              className="pl-9 bg-background rounded-xl border-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateParams({ search: search || null });
                }
              }}
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs font-bold uppercase tracking-widest hover:bg-destructive hover:text-destructive-foreground transition-all rounded-lg"
          >
            <X className="h-3 w-3 mr-2" />
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}
