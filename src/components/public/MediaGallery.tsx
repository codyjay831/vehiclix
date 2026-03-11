"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { VehicleMedia } from "@/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface MediaGalleryProps {
  media: VehicleMedia[];
}

export function MediaGallery({ media }: MediaGalleryProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);

  if (!media.length) {
    return (
      <div className="aspect-[3/2] w-full bg-muted rounded-2xl flex items-center justify-center text-muted-foreground italic">
        No images available
      </div>
    );
  }

  const activeImage = media[activeIndex];

  const nextImage = () => {
    setActiveIndex((prev) => (prev + 1) % media.length);
  };

  const prevImage = () => {
    setActiveIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  return (
    <div className="space-y-4">
      {/* Hero Image */}
      <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-muted group cursor-zoom-in">
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogTrigger>
            <img
              src={activeImage.url}
              alt="Vehicle Hero"
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </DialogTrigger>
          <DialogContent className="max-w-7xl border-none bg-transparent p-0 shadow-none">
            <div className="relative flex items-center justify-center h-[90vh] w-full">
              <img
                src={activeImage.url}
                alt="Full View"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
              
              {/* Lightbox Controls */}
              <button
                onClick={prevImage}
                className="absolute left-4 p-2 bg-background/20 backdrop-blur-md rounded-full text-white hover:bg-background/40 transition-colors"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 p-2 bg-background/20 backdrop-blur-md rounded-full text-white hover:bg-background/40 transition-colors"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Gallery Controls (Hero) */}
        {media.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        
        <div className="absolute top-4 right-4 p-2 bg-background/20 backdrop-blur-md rounded-full text-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="h-5 w-5" />
        </div>
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {media.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative flex-shrink-0 w-24 aspect-[3/2] rounded-lg overflow-hidden border-2 transition-all",
                activeIndex === index ? "border-primary opacity-100 ring-2 ring-primary/20" : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img src={item.url} alt={`Thumbnail ${index + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
