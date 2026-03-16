"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { LeadStatus } from "@prisma/client";
import { useEffect, useState, useTransition } from "react";
import { useDebounce } from "@/hooks/use-debounce";

interface LeadFiltersProps {
  countMap: Record<string, number>;
  totalCount: number;
}

export function LeadFilters({ countMap, totalCount }: LeadFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  const debouncedSearch = useDebounce(searchValue, 300);

  const currentStage = searchParams.get("stage") || "ALL";

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const currentQ = searchParams.get("q") || "";
    
    // Only update if the search query has actually changed
    if (debouncedSearch === currentQ) {
      return;
    }

    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [debouncedSearch, pathname, router, searchParams]);

  const handleStageChange = (stage: string) => {
    const params = new URLSearchParams(searchParams);
    if (stage === "ALL") {
      params.delete("stage");
    } else {
      params.set("stage", stage);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
      <Tabs value={currentStage} onValueChange={handleStageChange} className="w-full md:w-auto">
        <TabsList className="bg-muted/50 p-1 overflow-x-auto flex-nowrap w-full md:w-auto justify-start h-11">
          <TabsTrigger value="ALL" className="text-[10px] font-black uppercase tracking-wider italic px-4 h-9">
            All ({totalCount})
          </TabsTrigger>
          {Object.values(LeadStatus).map((s) => (
            <TabsTrigger 
              key={s} 
              value={s}
              className="text-[10px] font-black uppercase tracking-wider italic px-4 h-9"
            >
              {s} ({countMap[s] || 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative w-full md:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search name, email, phone..." 
          className="pl-10 h-11 rounded-xl"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        {searchValue && (
          <button 
            onClick={() => setSearchValue("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
