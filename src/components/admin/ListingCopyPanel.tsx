"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SerializedVehicleWithMedia } from "@/lib/vehicle-serialization";
import { 
  Facebook, 
  FileText, 
  Mail, 
  Sparkles,
  Info,
  CheckCircle2,
  Type
} from "lucide-react";
import { ListingGeneratorModal, GeneratorType } from "./ListingGeneratorModal";
import { formatDistanceToNow } from "date-fns";

interface ListingCopyPanelProps {
  vehicle: SerializedVehicleWithMedia;
}

export function ListingCopyPanel({ vehicle }: ListingCopyPanelProps) {
  const [activeType, setActiveType] = React.useState<GeneratorType | null>(null);

  const getDraftFor = (channel: string) => {
    return vehicle.listingDrafts?.find((d) => d.channel === channel);
  };

  return (
    <Card className="border-2 border-primary/10">
      <CardHeader>
        <CardTitle className="uppercase tracking-tighter font-black flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Listing Copy
        </CardTitle>
        <CardDescription className="font-medium">
          Create and save professional, channel-specific copy based on vehicle facts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Facebook */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Facebook</label>
              {getDraftFor("FACEBOOK") && (
                <span className="text-[9px] font-bold text-green-600 uppercase flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Draft
                </span>
              )}
            </div>
            <Button 
              className="font-bold h-10 bg-[#1877F2] hover:bg-[#166fe5]" 
              onClick={() => setActiveType("FACEBOOK")}
            >
              <Facebook className="mr-2 h-4 w-4" />
              Facebook
            </Button>
            {(() => {
              const draft = getDraftFor("FACEBOOK");
              return draft ? (
                <p className="text-[10px] text-muted-foreground/60 italic text-right pr-1">
                  {formatDistanceToNow(new Date(draft.updatedAt))} ago
                </p>
              ) : null;
            })()}
          </div>

          {/* Craigslist */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Craigslist</label>
              {getDraftFor("CRAIGSLIST") && (
                <span className="text-[9px] font-bold text-green-600 uppercase flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Draft
                </span>
              )}
            </div>
            <Button 
              variant="outline" 
              className="font-bold h-10 border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-700" 
              onClick={() => setActiveType("CRAIGSLIST")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Craigslist
            </Button>
            {(() => {
              const draft = getDraftFor("CRAIGSLIST");
              return draft ? (
                <p className="text-[10px] text-muted-foreground/60 italic text-right pr-1">
                  {formatDistanceToNow(new Date(draft.updatedAt))} ago
                </p>
              ) : null;
            })()}
          </div>

          {/* Generic */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Generic</label>
              {getDraftFor("GENERIC") && (
                <span className="text-[9px] font-bold text-green-600 uppercase flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Draft
                </span>
              )}
            </div>
            <Button 
              variant="outline" 
              className="font-bold h-10 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700" 
              onClick={() => setActiveType("GENERIC")}
            >
              <Type className="mr-2 h-4 w-4" />
              Generic
            </Button>
            {(() => {
              const draft = getDraftFor("GENERIC");
              return draft ? (
                <p className="text-[10px] text-muted-foreground/60 italic text-right pr-1">
                  {formatDistanceToNow(new Date(draft.updatedAt))} ago
                </p>
              ) : null;
            })()}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Email</label>
              {getDraftFor("EMAIL") && (
                <span className="text-[9px] font-bold text-green-600 uppercase flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Draft
                </span>
              )}
            </div>
            <Button 
              variant="outline" 
              className="font-bold h-10 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-700" 
              onClick={() => setActiveType("EMAIL")}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            {(() => {
              const draft = getDraftFor("EMAIL");
              return draft ? (
                <p className="text-[10px] text-muted-foreground/60 italic text-right pr-1">
                  {formatDistanceToNow(new Date(draft.updatedAt))} ago
                </p>
              ) : null;
            })()}
          </div>
        </div>

        <div className="mt-6 flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/50 p-3 rounded-lg border">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="font-bold uppercase tracking-widest mb-1 text-primary">Grounded Generation</p>
            <p>Drafts are saved per vehicle. AI is not used for memory; changes are strictly manual for factual grounding. Separate fields for title, body, tone, and length are supported for a professional pass.</p>
          </div>
        </div>
      </CardContent>

      {activeType && (
        <ListingGeneratorModal
          vehicle={vehicle}
          type={activeType}
          isOpen={!!activeType}
          onClose={() => setActiveType(null)}
        />
      )}
    </Card>
  );
}
