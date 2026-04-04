/**
 * Server-only vehicle photo pipeline: EXIF rotation, resize, JPEG encode.
 * Used during vehicle creation upload; sequential variant encoding to limit peak memory.
 */

const MAX_INPUT_BYTES = 10 * 1024 * 1024; // matches next.config serverActions.bodySizeLimit
/** Reject decompression bombs and pathological serverless memory use. */
const MAX_DIMENSION = 16_384;
const MAX_MEGAPIXELS = 50;

export interface VehicleImageVariants {
  thumb: Buffer;
  card: Buffer;
  gallery: Buffer;
}

function assertReasonableDimensions(width: number | undefined, height: number | undefined): void {
  const w = width ?? 0;
  const h = height ?? 0;
  if (w <= 0 || h <= 0) return;
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    throw new Error(`Image dimensions exceed ${MAX_DIMENSION}px on one side.`);
  }
  const mp = (w * h) / 1_000_000;
  if (mp > MAX_MEGAPIXELS) {
    throw new Error(`Image is too large (${mp.toFixed(1)}MP). Maximum is ${MAX_MEGAPIXELS} megapixels.`);
  }
}

/**
 * Builds thumb (~400px), card (~800px), and gallery (~1920px max width) JPEG variants.
 * EXIF orientation is applied via Sharp rotate() (default behavior).
 */
export async function generateVehicleImageVariants(input: Buffer): Promise<VehicleImageVariants> {
  if (input.length > MAX_INPUT_BYTES) {
    throw new Error("Image exceeds maximum size (10MB).");
  }

  const sharpMod = await import("sharp");
  const sharp = sharpMod.default;

  let meta: { width?: number; height?: number; hasAlpha?: boolean };
  try {
    meta = await sharp(input, { failOn: "none" }).metadata();
  } catch {
    throw new Error("Could not read this image. Use JPEG, PNG, or WebP.");
  }
  assertReasonableDimensions(meta.width, meta.height);

  let pipeline;
  try {
    pipeline = sharp(input, { failOn: "none" }).rotate();
    if (meta.hasAlpha) {
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    }
  } catch {
    throw new Error("Could not read this image. Use JPEG, PNG, or WebP.");
  }

  try {
    const thumb = await pipeline
      .clone()
      .resize({ width: 400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

    const card = await pipeline
      .clone()
      .resize({ width: 800, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    const gallery = await pipeline
      .clone()
      .resize({ width: 1920, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    return { thumb, card, gallery };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    throw new Error(`Could not optimize this image: ${message}`);
  }
}
