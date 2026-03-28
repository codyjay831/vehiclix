import "server-only";

import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** LSTM English traineddata shipped in npm (avoids runtime fetch to jsdelivr; required under restricted egress). */
function resolveLocalTesseractEngLangPath(): string {
  try {
    const pkg = require.resolve("@tesseract.js-data/eng/package.json");
    return path.join(path.dirname(pkg), "4.0.0_best_int");
  } catch {
    return path.join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int");
  }
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
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
export async function extractTextFromImageBuffer(buffer: Buffer): Promise<string> {
  const { createWorker, OEM } = await import("tesseract.js");
  const langPath = resolveLocalTesseractEngLangPath();
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    langPath,
    cacheMethod: "none",
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return typeof text === "string" ? text : "";
  } finally {
    await worker.terminate();
  }
}
