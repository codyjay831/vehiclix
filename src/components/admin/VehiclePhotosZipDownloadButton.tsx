"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;\s]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].replace(/^"+|"+$/g, ""));
    } catch {
      return null;
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;\s]+)/i.exec(header);
  if (plain?.[1]) return plain[1].replace(/^["']|["']$/g, "");
  return null;
}

export function VehiclePhotosZipDownloadButton({
  vehicleId,
  className,
}: {
  vehicleId: string;
  className?: string;
}) {
  const [busy, setBusy] = React.useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/inventory/${vehicleId}/photos-zip`, {
        credentials: "include",
      });
      const cd = res.headers.get("Content-Disposition");

      if (!res.ok) {
        let message = "Download failed.";
        try {
          const data = (await res.json()) as { error?: string };
          if (typeof data?.error === "string" && data.error.trim()) {
            message = data.error;
          }
        } catch {
          /* non-JSON body */
        }
        toast.error(message);
        return;
      }

      const blob = await res.blob();
      const downloadName =
        filenameFromContentDisposition(cd) ?? `vehicle-photos-${vehicleId.slice(0, 8)}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download photos. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={busy}
      className={cn("font-bold", className)}
      onClick={handleDownload}
    >
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Download Optimized Photos
    </Button>
  );
}
