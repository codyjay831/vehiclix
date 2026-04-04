"use client";

/**
 * Client-side resize/re-encode for vehicle listing photos before multipart upload.
 * Intended only for inventory `photos` in VehicleForm — not for intake documents/PDFs (those use other
 * FormData fields/actions). `application/pdf` and other non-image MIME types never pass `isClientCompressibleVehicleImage`.
 *
 * - JPEG/PNG/WebP only; other `File`s are returned unchanged.
 * - EXIF orientation is applied via `createImageBitmap` (`imageOrientation: "from-image"`).
 * - PNG/WebP alpha is flattened to white before JPEG encode (matches server Sharp flatten).
 * - Returning the original `File` on decode/encode failure is intentional: upload still succeeds; server pipeline validates.
 */

// Matches server gallery resize target (`generateVehicleImageVariants`: max width 1920, fit inside) so uploads
// are smaller without the server needing to upscale; larger originals are shrunk, smaller ones are not enlarged.
const MAX_LONG_EDGE_PX = 1920;

// Server re-encodes to JPEG ~q85 for stored variants. A slightly higher quality here limits visible "double JPEG"
// mush while still shrinking bytes on the wire for typical phone photos.
const OUTPUT_JPEG_QUALITY = 0.9;

// If the image already fits within MAX_LONG_EDGE and the file is modest, skip a client re-encode to avoid
// extra artifacts and CPU for thumbnails/already-exported JPEGs that won't shrink much.
const SKIP_IF_SIZE_LTE_BYTES = 450 * 1024;

const SUPPORTED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type CompressVehicleImageOptions = {
  maxLongEdgePx?: number;
  jpegQuality?: number;
  skipIfSizeLteBytes?: number;
};

function extensionLooksCompressible(name: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

export function isClientCompressibleVehicleImage(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (SUPPORTED_MIME.has(t)) return true;
  if (t && t !== "application/octet-stream") return false;
  return extensionLooksCompressible(file.name);
}

function jpegOutputName(originalName: string): string {
  const trimmed = originalName.trim();
  const base = trimmed ? trimmed.replace(/\.[^./\\]+$/i, "") : "photo";
  const safe = base.length > 0 ? base : "photo";
  return `${safe}.jpg`;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
}

/**
 * Resizes (if needed) and encodes as JPEG. Returns the original `file` when compression is skipped or not beneficial.
 */
export async function compressVehicleImageFile(
  file: File,
  options: CompressVehicleImageOptions = {}
): Promise<File> {
  const maxLongEdge = options.maxLongEdgePx ?? MAX_LONG_EDGE_PX;
  const jpegQuality = options.jpegQuality ?? OUTPUT_JPEG_QUALITY;
  const skipIfSizeLte = options.skipIfSizeLteBytes ?? SKIP_IF_SIZE_LTE_BYTES;

  // Non-JPEG/PNG/WebP (e.g. PDF if mis-routed) and empty files: never touch bytes.
  if (!isClientCompressibleVehicleImage(file) || file.size <= 0) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Intentional fail-safe: do not block upload if the browser cannot decode (corrupt file, unsupported path).
    return file;
  }

  try {
    const w = bitmap.width;
    const h = bitmap.height;
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return file;
    }

    const maxDim = Math.max(w, h);
    const scale = maxDim > maxLongEdge ? maxLongEdge / maxDim : 1;
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));

    if (scale >= 1 && file.size <= skipIfSizeLte) {
      return file;
    }

    if (typeof document === "undefined") {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const blob = await canvasToJpegBlob(canvas, jpegQuality);
    if (!blob || blob.size <= 0) {
      return file;
    }

    const smallerOrResized = scale < 1 || blob.size < file.size;
    if (!smallerOrResized) {
      // Prefer original when re-encode would not reduce size (avoids pointless second lossy pass before server).
      return file;
    }

    return new File([blob], jpegOutputName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

/**
 * Sequential compression to limit memory spikes on mobile; yields the event loop between files.
 * Never throws; failed entries fall back to the original file.
 * Preserves caller order: `out[i]` corresponds to `files[i]` for stable multipart `photos` part ordering.
 */
export async function compressVehicleImagesForUpload(
  files: File[],
  options?: CompressVehicleImageOptions
): Promise<File[]> {
  const out: File[] = [];
  for (let i = 0; i < files.length; i++) {
    try {
      out.push(await compressVehicleImageFile(files[i]!, options));
    } catch {
      out.push(files[i]!);
    }
    await new Promise<void>((r) => {
      setTimeout(r, 0);
    });
  }
  return out;
}
