import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const VIN_LIKE_17_RE = /[A-HJ-NPR-Z0-9]{17}/;
const MAX_OCR_IMAGE_WIDTH = 1800;
const MAX_OCR_IMAGE_DIMENSION = 8000;
const MAX_OCR_IMAGE_MEGAPIXELS = 24;

export type ImageOcrMeta = {
  imageWidth: number | null;
  imageHeight: number | null;
  imageMegapixels: number | null;
  ocrPass: 1 | 2;
  ocrTextLength: number;
  ocrDurationMs: number;
};

export type ImageOcrResult = {
  text: string;
  meta: ImageOcrMeta;
};

export class ImageOcrFailureError extends Error {
  readonly code:
    | "image_preprocess_failed"
    | "image_too_large_pixels"
    | "image_metadata_missing"
    | "image_ocr_failed";
  readonly meta: Partial<ImageOcrMeta>;

  constructor(
    code:
      | "image_preprocess_failed"
      | "image_too_large_pixels"
      | "image_metadata_missing"
      | "image_ocr_failed",
    message: string,
    meta: Partial<ImageOcrMeta> = {}
  ) {
    super(message);
    this.name = "ImageOcrFailureError";
    this.code = code;
    this.meta = meta;
  }
}

function hasVinLikeCandidate(text: string): boolean {
  const upper = (text || "").toUpperCase();
  return VIN_LIKE_17_RE.test(upper);
}

/** LSTM English traineddata shipped in npm (avoids runtime fetch to jsdelivr; required under restricted egress). */
function resolveLocalTesseractEngLangPath(): string {
  try {
    const pkg = require.resolve("@tesseract.js-data/eng/package.json");
    return path.join(path.dirname(pkg), "4.0.0_best_int");
  } catch {
    return path.join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int");
  }
}

/**
 * pdf-parse → pdfjs-dist evaluates `new DOMMatrix()` at module load before pdf.js's own
 * Node polyfill runs. Cloud Run / Node without DOMMatrix then throws ReferenceError.
 * @napi-rs/canvas is already a dependency of pdf-parse; we install globals first.
 */
let pdfJsNodePolyfillsApplied = false;

async function ensurePdfJsNodePolyfills(): Promise<void> {
  if (pdfJsNodePolyfillsApplied) return;
  const needsCanvasGlobals =
    typeof globalThis.DOMMatrix === "undefined" ||
    typeof globalThis.Path2D === "undefined" ||
    typeof globalThis.ImageData === "undefined";
  if (!needsCanvasGlobals) {
    pdfJsNodePolyfillsApplied = true;
    return;
  }
  const canvas = await import("@napi-rs/canvas");
  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = canvas.DOMMatrix as typeof globalThis.DOMMatrix;
  }
  if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D = canvas.Path2D as typeof globalThis.Path2D;
  }
  if (typeof globalThis.ImageData === "undefined") {
    globalThis.ImageData = canvas.ImageData as typeof globalThis.ImageData;
  }
  pdfJsNodePolyfillsApplied = true;
}

/**
 * pdf.js Node path uses a "fake worker" that dynamic-imports workerSrc. Default `./pdf.worker.mjs`
 * resolves next to pdf.mjs; standalone traces can omit that file — use an absolute file URL.
 */
function setPdfJsWorkerSrcAbsolute(pdfParseMod: typeof import("pdf-parse")): void {
  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfParseMod.PDFParse.setWorker(pathToFileURL(workerPath).href);
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  await ensurePdfJsNodePolyfills();
  const pdfParseMod = await import("pdf-parse");
  setPdfJsWorkerSrcAbsolute(pdfParseMod);
  const { PDFParse } = pdfParseMod;
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    return typeof textResult.text === "string" ? textResult.text : "";
  } finally {
    await parser.destroy();
  }
}

/**
 * OCR for PNG/JPEG; may be slow on large images. Caller should enforce timeout.
 * Uses vendored `@tesseract.js-data/eng` so workers do not fetch traineddata from a public CDN (breaks with PRIVATE_RANGES_ONLY egress).
 */
export async function extractTextFromImageBuffer(buffer: Buffer): Promise<ImageOcrResult> {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  let imageWidth: number | null = null;
  let imageHeight: number | null = null;
  let imageMegapixels: number | null = null;
  let preprocessed: Buffer;

  try {
    const metadata = await sharp(buffer, { failOn: "none" }).metadata();
    imageWidth = typeof metadata.width === "number" ? metadata.width : null;
    imageHeight = typeof metadata.height === "number" ? metadata.height : null;
    imageMegapixels =
      imageWidth && imageHeight ? Number(((imageWidth * imageHeight) / 1_000_000).toFixed(2)) : null;

    if (!imageWidth || !imageHeight) {
      throw new ImageOcrFailureError(
        "image_metadata_missing",
        "image_metadata_missing: Could not read image dimensions for OCR",
        {
          imageWidth,
          imageHeight,
          imageMegapixels,
        }
      );
    }
    if (
      imageWidth > MAX_OCR_IMAGE_DIMENSION ||
      imageHeight > MAX_OCR_IMAGE_DIMENSION ||
      (imageMegapixels != null && imageMegapixels > MAX_OCR_IMAGE_MEGAPIXELS)
    ) {
      throw new ImageOcrFailureError(
        "image_too_large_pixels",
        `image_too_large_pixels: Image dimensions exceed OCR guardrails (${imageWidth}x${imageHeight}, ${imageMegapixels}MP)`,
        {
          imageWidth,
          imageHeight,
          imageMegapixels,
        }
      );
    }

    // Normalize screenshots/photos for faster, steadier OCR in serverless environments.
    preprocessed = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_OCR_IMAGE_WIDTH, fit: "inside", withoutEnlargement: true })
      .grayscale()
      .normalise()
      .linear(1.15, -8)
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch (e) {
    if (e instanceof ImageOcrFailureError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new ImageOcrFailureError("image_preprocess_failed", `image_preprocess_failed: ${msg}`, {
      imageWidth,
      imageHeight,
      imageMegapixels,
    });
  }

  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const langPath = resolveLocalTesseractEngLangPath();
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    langPath,
    cacheMethod: "none",
  });
  const startedAt = Date.now();
  try {
    const {
      data: { text },
    } = await worker.recognize(preprocessed);
    const pass1Text = typeof text === "string" ? text : "";
    const pass1Length = pass1Text.trim().length;
    const pass1Usable = pass1Length >= 40 && hasVinLikeCandidate(pass1Text);
    if (pass1Usable) {
      return {
        text: pass1Text,
        meta: {
          imageWidth,
          imageHeight,
          imageMegapixels,
          ocrPass: 1,
          ocrTextLength: pass1Length,
          ocrDurationMs: Date.now() - startedAt,
        },
      };
    }

    // Fallback pass for low-signal scans/screenshots.
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1",
    });
    const {
      data: { text: pass2Raw },
    } = await worker.recognize(preprocessed);
    const pass2Text = typeof pass2Raw === "string" ? pass2Raw : "";
    return {
      text: pass2Text,
      meta: {
        imageWidth,
        imageHeight,
        imageMegapixels,
        ocrPass: 2,
        ocrTextLength: pass2Text.trim().length,
        ocrDurationMs: Date.now() - startedAt,
      },
    };
  } catch (e) {
    if (e instanceof ImageOcrFailureError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new ImageOcrFailureError("image_ocr_failed", `image_ocr_failed: ${msg}`, {
      imageWidth,
      imageHeight,
      imageMegapixels,
    });
  } finally {
    await worker.terminate();
  }
}
